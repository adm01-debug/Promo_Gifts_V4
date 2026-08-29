#!/usr/bin/env node
/**
 * check-lint-0011-drift.mjs
 *
 * Falha se surgir uma função em `public.*` sem `SET search_path` configurado
 * (Supabase lint 0011 — `function_search_path_mutable`), que NÃO esteja
 * documentada em `.security/lint-0011-allowlist.json`.
 *
 * Por que importa: sem `SET search_path`, uma função pode ser resolvida
 * contra objetos plantados por um atacante em schemas no `search_path` da
 * sessão (vetor de escalada de privilégio quando combinado com SECURITY
 * DEFINER). Snapshot 2026-07-15: 0 violações → o gate trava regressões.
 *
 * Fontes de dados (na ordem):
 *   1. `--from-file=<path.json>` — lista `[{fn:string}, ...]` (usado em testes).
 *   2. `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — consulta pg-meta.
 *   3. Sem nenhum dos dois → `static-pass` no modo advisory ou
 *      `inconclusive` quando `--require-live` exigir evidência live.
 *
 * Modo interativo do PO:
 *   `--update-allowlist` grava o snapshot atual em disco (usar apenas
 *   após revisão humana das novas funções).
 *
 * Exit codes: 0 (`passed`/`static-pass`), 1 (drift — falha), 2 (`inconclusive`/erro de config).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import {
  CHECK_RESULT_STATUS,
  concludeCheck,
  maskUrl,
  shouldRequireLive,
} from './check-result-contract.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ALLOWLIST_PATH = path.join(ROOT, '.security/lint-0011-allowlist.json');

const argv = process.argv.slice(2);
const fromFileArg = argv.find((a) => a.startsWith('--from-file='));
const UPDATE = argv.includes('--update-allowlist');
const REQUIRE_LIVE = shouldRequireLive(argv);

const SQL = `
  SELECT n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' AS fn
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.prokind IN ('f','p')
    AND (
      p.proconfig IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM unnest(p.proconfig) AS cfg WHERE cfg LIKE 'search_path=%'
      )
    )
  ORDER BY 1;
`.trim();

async function fetchLive() {
  const URL = process.env.VITE_SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL || !KEY) {
    return { kind: 'missing-config', maskedUrl: maskUrl(URL) };
  }
  const endpoint = `${URL.replace(/\/$/, '')}/pg-meta/default/query`;
  let res;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: SQL }),
    });
  } catch {
    return { kind: 'network-error', maskedUrl: maskUrl(URL) };
  }
  if (!res.ok) {
    return {
      kind: 'http-error',
      maskedUrl: maskUrl(URL),
      httpStatus: res.status,
      bodyLength: (await res.text()).length,
    };
  }
  let rows;
  try {
    rows = await res.json();
  } catch {
    return { kind: 'invalid-json', maskedUrl: maskUrl(URL) };
  }
  if (!Array.isArray(rows)) {
    return {
      kind: 'invalid-response',
      maskedUrl: maskUrl(URL),
      responseType: typeof rows,
    };
  }
  return {
    kind: 'live',
    maskedUrl: maskUrl(URL),
    functions: rows.map((r) => r.fn).filter(Boolean),
  };
}

function loadAllowlist() {
  if (!existsSync(ALLOWLIST_PATH)) {
    process.stderr.write(`[lint-0011] allowlist ausente: ${ALLOWLIST_PATH}\n`);
    process.exit(2);
  }
  const doc = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
  if (!Array.isArray(doc.functions)) {
    process.stderr.write(`[lint-0011] allowlist.functions inválida\n`);
    process.exit(2);
  }
  return { doc, set: new Set(doc.functions.map((e) => e.fn)) };
}

async function main() {
  let actual;
  if (fromFileArg) {
    const p = fromFileArg.slice('--from-file='.length);
    const raw = JSON.parse(readFileSync(p, 'utf8'));
    actual = (Array.isArray(raw) ? raw : raw.functions || []).map((r) =>
      typeof r === 'string' ? r : r.fn,
    );
  } else {
    const live = await fetchLive();
    if (live.kind !== 'live') {
      if (live.kind === 'missing-config') {
        return concludeCheck({
          check: 'lint-0011',
          status: REQUIRE_LIVE
            ? CHECK_RESULT_STATUS.INCONCLUSIVE
            : CHECK_RESULT_STATUS.STATIC_PASS,
          summary: REQUIRE_LIVE
            ? 'sem credenciais pg-meta; evidência live obrigatória não disponível'
            : 'sem credenciais pg-meta; verificação ficou em modo estático',
          details: {
            reason: live.kind,
            requireLive: REQUIRE_LIVE,
            maskedUrl: live.maskedUrl,
          },
        });
      }

      return concludeCheck({
        check: 'lint-0011',
        status: CHECK_RESULT_STATUS.INCONCLUSIVE,
        summary: `pg-meta indisponível para consulta live (${live.kind})`,
        details: {
          reason: live.kind,
          maskedUrl: live.maskedUrl,
          httpStatus: live.httpStatus,
          responseType: live.responseType,
          bodyLength: live.bodyLength,
        },
      });
    }
    actual = live.functions;
  }

  const { doc, set: allowed } = loadAllowlist();
  const actualSet = new Set(actual);

  const newFindings = actual.filter((fn) => !allowed.has(fn));
  const staleAllowlist = doc.functions.map((e) => e.fn).filter((fn) => !actualSet.has(fn));

  if (UPDATE) {
    const merged = new Map(doc.functions.map((e) => [e.fn, e]));
    for (const fn of newFindings) {
      merged.set(fn, { fn, reason: 'TODO: documentar motivo antes de aprovar PR' });
    }
    for (const fn of staleAllowlist) merged.delete(fn);
    const next = {
      ...doc,
      functions: Array.from(merged.values()).sort((a, b) => a.fn.localeCompare(b.fn)),
    };
    writeFileSync(ALLOWLIST_PATH, JSON.stringify(next, null, 2) + '\n');
    process.stderr.write(
      `[lint-0011] allowlist atualizada: +${newFindings.length} / -${staleAllowlist.length}\n`,
    );
    process.exit(0);
  }

  const missingReasons = doc.functions
    .filter((e) => !e.reason || !String(e.reason).trim())
    .map((e) => e.fn);

  const problems = [];
  if (newFindings.length) {
    problems.push(
      `❌ ${newFindings.length} finding(s) 0011 (search_path mutável) NÃO documentados:\n` +
        newFindings.map((fn) => `   - ${fn}`).join('\n'),
    );
  }
  if (missingReasons.length) {
    problems.push(
      `❌ ${missingReasons.length} entrada(s) na allowlist sem \`reason\`:\n` +
        missingReasons.map((fn) => `   - ${fn}`).join('\n'),
    );
  }

  if (staleAllowlist.length) {
    process.stderr.write(
      `⚠️  ${staleAllowlist.length} entrada(s) da allowlist não existem mais no DB:\n` +
        staleAllowlist.map((fn) => `   - ${fn}`).join('\n') +
        `\n   Rode: node scripts/check-lint-0011-drift.mjs --update-allowlist\n`,
    );
  }

  if (problems.length) {
    process.stderr.write('\n' + problems.join('\n\n') + '\n\n');
    process.stderr.write(
      "Correção padrão: adicione `SET search_path = public` (ou `= ''`) na função.\n" +
        'Exemplo:\n' +
        '  CREATE OR REPLACE FUNCTION public.minha_fn(...) RETURNS ...\n' +
        '  LANGUAGE plpgsql\n' +
        '  SECURITY DEFINER\n' +
        '  SET search_path = public   -- <-- obrigatório\n' +
        '  AS $$ ... $$;\n\n' +
        'Se a função precisa MESMO ficar sem search_path fixo (raro), adicione manualmente em\n' +
        '.security/lint-0011-allowlist.json com um `reason` real, OU rode\n' +
        '`node scripts/check-lint-0011-drift.mjs --update-allowlist` e edite o motivo antes do commit.\n',
    );
    process.exit(1);
  }

  process.stderr.write(
    `✅ lint 0011: ${actual.length} finding(s) — todos documentados na allowlist.\n`,
  );
  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`[lint-0011] erro: ${e.stack || e.message}\n`);
  process.exit(2);
});
