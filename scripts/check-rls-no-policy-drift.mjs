#!/usr/bin/env node
/**
 * check-rls-no-policy-drift.mjs  (P200-E045)
 *
 * Detecta tabelas com RLS habilitada e ZERO policies (`relrowsecurity=true`
 * mas sem entrada em `pg_policies`) que NÃO estejam documentadas em
 * `.security/rls-no-policy-allowlist.json`.
 *
 * Por que importa: tabela com RLS ligada e sem policy fica em deny-all
 * para roles não-owner que não tenham bypassrls. O comportamento "funciona
 * porque o serviço usa service_role" pode se tornar um bloqueio invisível
 * se a intenção era adicionar policies depois — e já aconteceu (2026-09-16).
 * O gate trava adição acidental de tabelas nesse estado sem revisão explícita.
 *
 * Fontes de dados:
 *   1. `--from-file=<path.json>` — lista `[{table:string}, ...]` (testes).
 *   2. `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` — Management API (CI).
 *   3. `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — pg-meta local.
 *   4. Sem credenciais → `static-pass` (advisory) ou `inconclusive`
 *      quando `--require-live` exigir evidência live.
 *
 * Modo --gate (sem credenciais): valida integridade da allowlist (todos os
 * campos obrigatórios preenchidos, sem reason "TODO"). Não precisa de BD.
 *
 * Exit codes: 0 (passed/static-pass), 1 (drift/allowlist inválida), 2 (erro)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  CHECK_RESULT_STATUS,
  concludeCheck,
  maskUrl,
  shouldRequireLive,
} from './check-result-contract.mjs';
import { querySupabaseReadOnly } from './supabase-read-only-query.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ALLOWLIST_PATH = path.join(ROOT, '.security/rls-no-policy-allowlist.json');
const SCHEMAS_TXT = path.join(ROOT, 'supabase/baseline/schemas.txt');

const argv = process.argv.slice(2);
const fromFileArg = argv.find((a) => a.startsWith('--from-file='));
const UPDATE = argv.includes('--update-allowlist');
const REQUIRE_LIVE = shouldRequireLive(argv);
// --gate: valida integridade da allowlist (sem live DB)
const GATE_MODE = argv.includes('--gate');

// E045: lê schemas de aplicação do SSOT (schemas.txt — mesmo do check-policies-baseline)
function loadAppSchemas() {
  try {
    const raw = readFileSync(SCHEMAS_TXT, 'utf8');
    const schemas = raw.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    return schemas.length > 0 ? schemas : ['public'];
  } catch {
    return ['public'];
  }
}

const APP_SCHEMAS = loadAppSchemas();
const schemasLiteral = APP_SCHEMAS.map((s) => `'${s}'`).join(', ');

const SQL = `
  SELECT n.nspname || '.' || c.relname AS "table"
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r','p')
    AND c.relrowsecurity = true
    AND n.nspname = ANY(ARRAY[${schemasLiteral}])
    AND NOT EXISTS (
      SELECT 1 FROM pg_policy pol WHERE pol.polrelid = c.oid
    )
  ORDER BY 1;
`.trim();

async function fetchLive() {
  const result = await querySupabaseReadOnly(SQL);
  if (result.kind !== 'live') {
    return { ...result, maskedUrl: maskUrl(result.target) };
  }
  return {
    kind: 'live',
    source: result.source,
    maskedUrl: maskUrl(result.target),
    tables: result.rows.map((r) => r.table).filter(Boolean),
  };
}

function loadAllowlist() {
  let raw;
  try {
    raw = readFileSync(ALLOWLIST_PATH, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') {
      process.stderr.write(`[rls-no-policy] allowlist ausente: ${ALLOWLIST_PATH}\n`);
      process.exit(2);
    }
    throw e;
  }
  const doc = JSON.parse(raw);
  if (!Array.isArray(doc.tables)) {
    process.stderr.write(`[rls-no-policy] allowlist.tables inválida\n`);
    process.exit(2);
  }
  return { doc, set: new Set(doc.tables.map((e) => e.table)) };
}

/**
 * Valida integridade da allowlist sem precisar de live DB.
 * Retorna array de problemas encontrados (vazio = OK).
 */
function validateAllowlistIntegrity(doc) {
  const problems = [];
  for (const entry of doc.tables) {
    if (!entry.table || typeof entry.table !== 'string') {
      problems.push(`entrada sem campo 'table' válido: ${JSON.stringify(entry)}`);
      continue;
    }
    if (!entry.reason || !String(entry.reason).trim()) {
      problems.push(`${entry.table}: campo 'reason' ausente ou vazio`);
    } else if (/TODO|PENDENTE|FALTA|PLACEHOLDER/i.test(entry.reason)) {
      problems.push(`${entry.table}: reason contém marcador de pendência ('TODO'/'PENDENTE')`);
    }
  }
  return problems;
}

async function main() {
  const { doc, set: allowed } = loadAllowlist();

  // ── Gate mode (sem live DB): valida só a integridade da allowlist ──────────
  if (GATE_MODE && !fromFileArg) {
    const integrityProblems = validateAllowlistIntegrity(doc);
    if (integrityProblems.length) {
      process.stderr.write(
        `❌ rls-no-policy: allowlist com ${integrityProblems.length} problema(s):\n` +
          integrityProblems.map((p) => `   - ${p}`).join('\n') +
          '\n\nCorreção: preencher o campo "reason" em .security/rls-no-policy-allowlist.json\n',
      );
      process.exit(1);
    }

    return concludeCheck({
      check: 'rls-no-policy',
      status: CHECK_RESULT_STATUS.STATIC_PASS,
      summary: `allowlist válida (${doc.tables.length} tabela(s) documentada(s)); sem live DB em --gate`,
      details: { allowlistSize: doc.tables.length },
    });
  }

  // ── Live ou --from-file ────────────────────────────────────────────────────
  let actual;
  if (fromFileArg) {
    const p = fromFileArg.slice('--from-file='.length);
    const raw = JSON.parse(readFileSync(p, 'utf8'));
    actual = (Array.isArray(raw) ? raw : raw.tables || []).map((r) =>
      typeof r === 'string' ? r : r.table,
    );
  } else {
    const live = await fetchLive();
    if (live.kind !== 'live') {
      if (live.kind === 'missing-config') {
        return concludeCheck({
          check: 'rls-no-policy',
          status: REQUIRE_LIVE
            ? CHECK_RESULT_STATUS.INCONCLUSIVE
            : CHECK_RESULT_STATUS.STATIC_PASS,
          summary: REQUIRE_LIVE
            ? 'sem credenciais pg-meta; evidência live obrigatória não disponível'
            : 'sem credenciais pg-meta; verificação ficou em modo estático',
          details: { reason: live.kind, requireLive: REQUIRE_LIVE, maskedUrl: live.maskedUrl },
        });
      }
      return concludeCheck({
        check: 'rls-no-policy',
        status: CHECK_RESULT_STATUS.INCONCLUSIVE,
        summary: `pg-meta indisponível para consulta live (${live.kind})`,
        details: { reason: live.kind, maskedUrl: live.maskedUrl, httpStatus: live.httpStatus },
      });
    }
    actual = live.tables;
  }

  const actualSet = new Set(actual);
  const newFindings = actual.filter((t) => !allowed.has(t));
  const staleAllowlist = doc.tables.map((e) => e.table).filter((t) => !actualSet.has(t));

  if (UPDATE) {
    const merged = new Map(doc.tables.map((e) => [e.table, e]));
    for (const t of newFindings) {
      merged.set(t, {
        table: t,
        reason: 'TODO: documentar se é deny-all intencional ou RLS esquecida (verificar secdef_fn/cron_job)',
        secdef_fn: null,
        cron_job: null,
      });
    }
    for (const t of staleAllowlist) merged.delete(t);
    const next = {
      ...doc,
      tables: Array.from(merged.values()).sort((a, b) => a.table.localeCompare(b.table)),
    };
    writeFileSync(ALLOWLIST_PATH, JSON.stringify(next, null, 2) + '\n');
    process.stderr.write(
      `[rls-no-policy] allowlist atualizada: +${newFindings.length} / -${staleAllowlist.length}\n`,
    );
    process.exit(0);
  }

  // Integridade da allowlist (reasons pendentes)
  const integrityProblems = validateAllowlistIntegrity(doc);

  const problems = [];
  if (newFindings.length) {
    problems.push(
      `🚨 ${newFindings.length} tabela(s) com RLS e ZERO policies fora da allowlist:\n` +
        newFindings.map((t) => `   - ${t}`).join('\n'),
    );
  }
  if (integrityProblems.length) {
    problems.push(
      `❌ ${integrityProblems.length} problema(s) na allowlist:\n` +
        integrityProblems.map((p) => `   - ${p}`).join('\n'),
    );
  }

  if (staleAllowlist.length) {
    process.stderr.write(
      `⚠️  ${staleAllowlist.length} entrada(s) da allowlist não encontradas no BD:\n` +
        staleAllowlist.map((t) => `   - ${t}`).join('\n') +
        `\n   Rode: node scripts/check-rls-no-policy-drift.mjs --update-allowlist\n`,
    );
  }

  if (problems.length) {
    process.stderr.write('\n' + problems.join('\n\n') + '\n\n');
    process.stderr.write(
      'Opções:\n' +
        '  1. Adicionar policies à tabela (o padrão esperado)\n' +
        '  2. Se deny-all é intencional: documentar em .security/rls-no-policy-allowlist.json\n' +
        '     com reason real (não "TODO"), secdef_fn e/ou cron_job que escrevem na tabela.\n' +
        '  3. Rode: node scripts/check-rls-no-policy-drift.mjs --update-allowlist\n' +
        '     e preencha os campos antes de abrir o PR.\n',
    );
    process.exit(1);
  }

  process.stderr.write(
    `✅ rls-no-policy: ${actual.length} tabela(s) RLS-sem-policy — todas documentadas na allowlist.\n`,
  );
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`[rls-no-policy] erro inesperado: ${err.message}\n`);
  process.exit(2);
});
