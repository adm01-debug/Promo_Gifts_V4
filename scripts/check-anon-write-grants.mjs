#!/usr/bin/env node
/**
 * check-anon-write-grants.mjs
 *
 * PLANO_DBA E22 — gate permanente para o P1 de 07-16 (FECHADO, 0 tabelas):
 * falha se `anon` tiver GRANT de INSERT/UPDATE/DELETE em qualquer tabela
 * `public`, fora de uma allowlist deliberadamente vazia
 * (.security/anon-write-grants-allowlist.json).
 *
 * Por que importa: até 2026-07-16 ~230 tabelas tinham GRANT de escrita para
 * anon (incidente 2026-06-11, ver docs/SCHEMA_REFERENCE.md §8.5). Hoje são
 * 0 — mas sem gate, uma migration antiga reaplicada ou um GRANT solto num
 * commit do Lovable reabre a brecha em minutos, sem ninguém notar até o
 * próximo audit manual.
 *
 * Consulta canônica: docs/SCHEMA_REFERENCE.md §8.5
 * (`information_schema.role_table_grants` — ainda pg_catalog-equivalente via
 * SQL, nunca PostgREST/OpenAPI — REGRA #8 corolário).
 *
 * Fonte de dados: Management API read-only via
 * scripts/supabase-read-only-query.mjs (mesmo padrão de
 * check-secdef-anon-drift.mjs / check-ddl-out-of-band.mjs / E46). Sem
 * SUPABASE_ACCESS_TOKEN/SUPABASE_PROJECT_REF → static-pass/inconclusive
 * conforme scripts/check-result-contract.mjs.
 *
 * Uso:
 *   node scripts/check-anon-write-grants.mjs [--require-live] [--from-file=<path.json>]
 *
 * Exit codes: 0 (passed/static-pass), 1 (failed — grant novo fora da allowlist),
 *             2 (inconclusive/erro).
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHECK_RESULT_STATUS,
  concludeCheck,
  maskUrl,
  shouldRequireLive,
} from './check-result-contract.mjs';
import { querySupabaseReadOnly } from './supabase-read-only-query.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ALLOWLIST_PATH = join(ROOT, '.security/anon-write-grants-allowlist.json');

const argv = process.argv.slice(2);
const REQUIRE_LIVE = shouldRequireLive(argv);
const fromFileArg = argv.find((a) => a.startsWith('--from-file='));

// docs/SCHEMA_REFERENCE.md §8.5
const SQL = `
  SELECT DISTINCT table_name, privilege_type
  FROM information_schema.role_table_grants
  WHERE table_schema='public' AND grantee='anon'
    AND privilege_type IN ('INSERT','UPDATE','DELETE')
  ORDER BY table_name, privilege_type;
`.trim();

export function loadAllowlist(path = ALLOWLIST_PATH) {
  if (!existsSync(path)) return { grants: [] };
  const doc = JSON.parse(readFileSync(path, 'utf8'));
  return { grants: Array.isArray(doc.grants) ? doc.grants : [] };
}

/**
 * Função pura central — mesmo padrão de computeDriftCandidates (E46) e
 * evaluateSyncLogGate (E48): injetável, sem I/O, fácil de testar por
 * mutação.
 */
export function computeViolations({ liveGrants, allowlist }) {
  const allowedKeys = new Set(
    allowlist.grants.map((g) => `${g.table_name}::${g.privilege_type}`),
  );
  return liveGrants
    .filter((g) => !allowedKeys.has(`${g.table_name}::${g.privilege_type}`))
    .slice()
    .sort((a, b) =>
      a.table_name === b.table_name
        ? a.privilege_type.localeCompare(b.privilege_type)
        : a.table_name.localeCompare(b.table_name),
    );
}

async function fetchLiveGrants() {
  return querySupabaseReadOnly(SQL);
}

async function main() {
  let liveGrants;

  if (fromFileArg) {
    const p = fromFileArg.slice('--from-file='.length);
    const raw = JSON.parse(readFileSync(p, 'utf8'));
    liveGrants = Array.isArray(raw) ? raw : raw.grants || [];
  } else {
    const live = await fetchLiveGrants();
    const maskedUrl = live.target ? maskUrl(live.target) : undefined;
    if (live.kind !== 'live') {
      const status =
        live.kind === 'missing-config'
          ? REQUIRE_LIVE
            ? CHECK_RESULT_STATUS.INCONCLUSIVE
            : CHECK_RESULT_STATUS.STATIC_PASS
          : CHECK_RESULT_STATUS.INCONCLUSIVE;
      return concludeCheck({
        check: 'anon-write-grants',
        status,
        summary:
          live.kind === 'missing-config'
            ? 'sem SUPABASE_ACCESS_TOKEN/SUPABASE_PROJECT_REF; checagem ficou em modo estático'
            : `Management API indisponível para consulta live (${live.kind})`,
        details: { reason: live.kind, maskedUrl },
      });
    }
    liveGrants = live.rows;
  }

  const allowlist = loadAllowlist();
  const violations = computeViolations({ liveGrants, allowlist });

  const report = {
    checkedAt: new Date().toISOString(),
    allowlistPath: ALLOWLIST_PATH,
    liveGrantCount: liveGrants.length,
    allowlistedGrantCount: allowlist.grants.length,
    violations,
  };

  if (violations.length > 0) {
    return concludeCheck({
      check: 'anon-write-grants',
      status: CHECK_RESULT_STATUS.FAILED,
      summary: `${violations.length} GRANT(s) de escrita para anon fora da allowlist (P1 reaberto): ${violations
        .map((v) => `${v.table_name}.${v.privilege_type}`)
        .join(', ')}`,
      details: report,
    });
  }

  return concludeCheck({
    check: 'anon-write-grants',
    status: CHECK_RESULT_STATUS.PASSED,
    summary: `0 GRANT(s) de escrita para anon fora da allowlist (P1 continua fechado; ${allowlist.grants.length} exceção(ões) documentada(s))`,
    details: report,
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((e) => {
    process.stderr.write(`[anon-write-grants] erro: ${e.stack || e.message}\n`);
    process.exit(2);
  });
}
