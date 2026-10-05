#!/usr/bin/env node
/**
 * check-policies-baseline.mjs
 *
 * Baseline assinado das RLS policies do schema `public` (auditoria 20-dim,
 * Onda 2 — complementa o schema_signature do drift de DDL).
 *
 * O que faz: consulta `pg_policies` no projeto canônico (read-only, via
 * Management API) e compara com `.security/policies-baseline.json`, um
 * snapshot com hash sha256 das linhas. Qualquer policy criada, removida ou
 * alterada (qual/with_check/cmd/roles) FORA de um PR revisado aparece como
 * drift — é o equivalente, para RLS, do detector de DDL out-of-band.
 *
 * Por que importa: uma policy dropada ou afrouxada fora do fluxo de
 * migrations abre dados silenciosamente (e o schema_signature não cobre
 * policies — só tabelas/colunas). O baseline commitado torna cada mudança
 * visível em diff de PR.
 *
 * Fontes de dados (na ordem):
 *   1. `--from-file=<path.json>` — lista de linhas pg_policies (testes).
 *   2. `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` — Management API
 *      read-only (CI/canônico).
 *   3. `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — pg-meta local.
 *   4. Sem nenhum dos dois → `static-pass` (ou `inconclusive` com
 *      `--require-live`), mesmo contrato de check-result-contract.mjs.
 *
 * Modo interativo do PO:
 *   `--update-baseline` regrava o snapshot a partir do live (usar só após
 *   revisão humana do diff de policies).
 *
 * Exit codes: 0 (`passed`/`static-pass`), 1 (drift — falha),
 * 2 (`inconclusive`/erro de config).
 */

import { createHash } from 'node:crypto';
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
const BASELINE_PATH = path.join(ROOT, '.security/policies-baseline.json');

const argv = process.argv.slice(2);
const fromFileArg = argv.find((a) => a.startsWith('--from-file='));
const UPDATE = argv.includes('--update-baseline');
const REQUIRE_LIVE = shouldRequireLive(argv);

const SQL = `
  SELECT schemaname, tablename, policyname, permissive,
         roles::text AS roles, cmd,
         coalesce(qual, '') AS qual, coalesce(with_check, '') AS with_check
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY schemaname, tablename, policyname;
`.trim();

function normalizeRow(row) {
  return {
    schemaname: String(row.schemaname ?? ''),
    tablename: String(row.tablename ?? ''),
    policyname: String(row.policyname ?? ''),
    permissive: String(row.permissive ?? ''),
    roles: String(row.roles ?? ''),
    cmd: String(row.cmd ?? ''),
    qual: String(row.qual ?? ''),
    with_check: String(row.with_check ?? ''),
  };
}

function policyKey(p) {
  return `${p.schemaname}.${p.tablename}.${p.policyname}`;
}

function hashPolicies(policies) {
  return createHash('sha256').update(JSON.stringify(policies)).digest('hex');
}

async function fetchLive() {
  const result = await querySupabaseReadOnly(SQL);
  if (result.kind !== 'live') {
    return { ...result, maskedUrl: maskUrl(result.target) };
  }
  return {
    kind: 'live',
    source: result.source,
    maskedUrl: maskUrl(result.target),
    policies: result.rows.map(normalizeRow),
  };
}

function loadBaseline() {
  let raw;
  try {
    raw = readFileSync(BASELINE_PATH, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') {
      process.stderr.write(
        `[policies-baseline] baseline ausente: ${BASELINE_PATH}\n` +
          'Gere com: node scripts/check-policies-baseline.mjs --update-baseline\n',
      );
      process.exit(2);
    }
    throw e;
  }
  const doc = JSON.parse(raw);
  if (!Array.isArray(doc.policies)) {
    process.stderr.write('[policies-baseline] baseline.policies inválida\n');
    process.exit(2);
  }
  const policies = doc.policies.map(normalizeRow);
  return { doc, policies };
}

function describePolicy(p) {
  return `${policyKey(p)} [${p.cmd}|${p.permissive}|roles=${p.roles}]`;
}

async function main() {
  let actual;
  let source = 'from-file';
  if (fromFileArg) {
    const p = fromFileArg.slice('--from-file='.length);
    const raw = JSON.parse(readFileSync(p, 'utf8'));
    const rows = Array.isArray(raw) ? raw : raw.policies || [];
    actual = rows.map(normalizeRow);
  } else {
    const live = await fetchLive();
    if (live.kind !== 'live') {
      const status =
        live.kind === 'missing-config' && !REQUIRE_LIVE
          ? CHECK_RESULT_STATUS.STATIC_PASS
          : CHECK_RESULT_STATUS.INCONCLUSIVE;
      return concludeCheck({
        check: 'policies-baseline',
        status,
        summary:
          live.kind === 'missing-config'
            ? 'sem credenciais Supabase read-only; verificação ficou em modo estático'
            : `consulta live indisponível (${live.kind})`,
        details: {
          reason: live.kind,
          requireLive: REQUIRE_LIVE,
          maskedUrl: live.maskedUrl,
        },
      });
    }
    actual = live.policies;
    source = live.source;
  }

  if (UPDATE) {
    const next = {
      version: 1,
      pending_seed: false,
      generated_at: new Date().toISOString(),
      project_ref: process.env.SUPABASE_PROJECT_REF ?? null,
      sha256: hashPolicies(actual),
      policies: actual,
    };
    writeFileSync(BASELINE_PATH, JSON.stringify(next, null, 2) + '\n');
    process.stderr.write(
      `[policies-baseline] baseline atualizada: ${actual.length} policies (sha256 ${next.sha256.slice(0, 12)}…)\n`,
    );
    process.exit(0);
  }

  const { doc, policies: baseline } = loadBaseline();

  // Bootstrap: baseline commitada como `pending_seed` (sem snapshot real
  // ainda, porque a seed exige credenciais do projeto canônico). O gate fica
  // dormente — static-pass com aviso — até o seed inicial via
  // `--update-baseline` (workflow policies-baseline, dispatch com seed=true).
  if (doc.pending_seed === true) {
    return concludeCheck({
      check: 'policies-baseline',
      status: CHECK_RESULT_STATUS.STATIC_PASS,
      summary: 'baseline pendente de seed inicial — gate dormente até o primeiro snapshot live',
      details: { source, liveRows: actual.length },
    });
  }

  // Integridade do arquivo assinado: hash gravado deve bater com as linhas
  // gravadas — se alguém editar a baseline sem regerar o hash, o drift
  // aparente vira suspeita de adulteração manual.
  const recordedHash = doc.sha256;
  const recomputedHash = hashPolicies(baseline);
  if (recordedHash && recordedHash !== recomputedHash) {
    return concludeCheck({
      check: 'policies-baseline',
      status: CHECK_RESULT_STATUS.FAILED,
      summary: 'baseline adulterada: sha256 gravado não confere com as policies do arquivo',
      details: { recordedHash, recomputedHash },
    });
  }

  const baselineByKey = new Map(baseline.map((p) => [policyKey(p), p]));
  const actualByKey = new Map(actual.map((p) => [policyKey(p), p]));

  const added = actual.filter((p) => !baselineByKey.has(policyKey(p)));
  const removed = baseline.filter((p) => !actualByKey.has(policyKey(p)));
  const changed = actual.filter((p) => {
    const base = baselineByKey.get(policyKey(p));
    return base && hashPolicies([base]) !== hashPolicies([p]);
  });

  const problems = [];
  if (added.length) {
    problems.push(
      `🚨 ${added.length} policy(ies) NOVA(S) fora do baseline:\n` +
        added.map((p) => `   - ${describePolicy(p)}`).join('\n'),
    );
  }
  if (removed.length) {
    problems.push(
      `🚨 ${removed.length} policy(ies) REMOVIDA(S) vs baseline:\n` +
        removed.map((p) => `   - ${describePolicy(p)}`).join('\n'),
    );
  }
  if (changed.length) {
    problems.push(
      `🚨 ${changed.length} policy(ies) ALTERADA(S) (qual/with_check/cmd/roles):\n` +
        changed.map((p) => `   - ${describePolicy(p)}`).join('\n'),
    );
  }

  if (problems.length) {
    process.stderr.write('\n' + problems.join('\n\n') + '\n\n');
    process.stderr.write(
      'Cada drift de policy precisa de PR revisado. Se a mudança é intencional\n' +
        '(migration nova no mesmo PR), regenere o baseline:\n' +
        '  node scripts/check-policies-baseline.mjs --update-baseline\n' +
        'e commite `.security/policies-baseline.json` junto.\n',
    );
    return concludeCheck({
      check: 'policies-baseline',
      status: CHECK_RESULT_STATUS.FAILED,
      summary: `drift de policies: +${added.length} / -${removed.length} / ~${changed.length}`,
      details: {
        source,
        added: added.map(policyKey),
        removed: removed.map(policyKey),
        changed: changed.map(policyKey),
      },
    });
  }

  return concludeCheck({
    check: 'policies-baseline',
    status: CHECK_RESULT_STATUS.PASSED,
    summary: `${actual.length} policies conferem com o baseline assinado`,
    details: {
      source,
      total: actual.length,
      baselineSha256: recomputedHash.slice(0, 12),
    },
  });
}

main().catch((e) => {
  process.stderr.write(`[policies-baseline] erro: ${e.stack || e.message}\n`);
  process.exit(2);
});
