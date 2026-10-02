#!/usr/bin/env node
/**
 * check-security-definer-audit.mjs
 * Gate 5 — CHECK 2: audita SECURITY DEFINER functions via Management API.
 *
 * E39 (2026-10-01): reimplementado via Management API (pg_proc.proconfig)
 * em vez de RPC REST + anon key (REGRA #8 corolário: pg_catalog, nunca
 * PostgREST). Mesmo padrão de check-anon-write-grants.mjs.
 *
 * Falha (exit 1) se qualquer função SECURITY DEFINER em public não tiver
 * search_path explícito em proconfig.
 * Falha-fechado (inconclusive, exit 2) se sem credenciais live.
 *
 * Aceite E39: lista funções auditadas (> 0) no summary — resultado suspeito
 * se 0 funções retornadas.
 *
 * Exit codes: 0 (passed/static-pass), 1 (failed), 2 (inconclusive)
 */

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHECK_RESULT_STATUS,
  concludeCheck,
  maskUrl,
  shouldRequireLive,
} from './check-result-contract.mjs';
import { querySupabaseReadOnly } from './supabase-read-only-query.mjs';

const argv = process.argv.slice(2);
const REQUIRE_LIVE = shouldRequireLive(argv);

// Funções SECURITY DEFINER sem search_path que foram revisadas e aprovadas.
// Adicionar aqui só com revisão de segurança explícita (schema, oid, reason).
const INTENTIONAL_MISSING_SEARCH_PATH = new Set([
  // Exemplo: 'fn_nome|argumento text'
]);

// docs/SCHEMA_REFERENCE.md §8 corolário: pg_catalog, nunca PostgREST.
// pg_proc.proconfig: array de GUC settings da função; search_path aparece
// como 'search_path=public,pg_temp' ou similar.
const SQL = `
  SELECT
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    p.proconfig
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
  ORDER BY p.proname, p.oid;
`.trim();

/**
 * Função pura: dado rows de pg_proc, retorna as que não têm search_path
 * e não estão na lista de exceções documentadas.
 */
export function computeViolations(rows) {
  return rows.filter((r) => {
    const key = `${r.function_name}|${r.arguments}`;
    if (INTENTIONAL_MISSING_SEARCH_PATH.has(key)) return false;
    const cfg = r.proconfig;
    if (!cfg) return true; // null = sem search_path
    const hasSearchPath = Array.isArray(cfg)
      ? cfg.some((c) => String(c).startsWith('search_path='))
      : String(cfg).includes('search_path=');
    return !hasSearchPath;
  });
}

async function main() {
  const live = await querySupabaseReadOnly(SQL);
  const maskedUrl = live.target ? maskUrl(live.target) : undefined;

  if (live.kind !== 'live') {
    const status =
      live.kind === 'missing-config'
        ? REQUIRE_LIVE
          ? CHECK_RESULT_STATUS.INCONCLUSIVE
          : CHECK_RESULT_STATUS.STATIC_PASS
        : CHECK_RESULT_STATUS.INCONCLUSIVE;
    return concludeCheck({
      check: 'security-definer-audit',
      status,
      summary:
        live.kind === 'missing-config'
          ? 'sem SUPABASE_ACCESS_TOKEN/SUPABASE_PROJECT_REF; checagem ficou em modo estático'
          : `Management API indisponível (${live.kind})`,
      details: { reason: live.kind, maskedUrl },
    });
  }

  const rows = live.rows ?? [];

  // Aceite E39: resultado suspeito se 0 funções retornadas (query pode ter falhado)
  if (rows.length === 0) {
    return concludeCheck({
      check: 'security-definer-audit',
      status: CHECK_RESULT_STATUS.INCONCLUSIVE,
      summary:
        'Nenhuma função SECURITY DEFINER encontrada em public — resultado suspeito; verifique credenciais',
      details: { totalSecurityDefiner: 0, violations: [] },
    });
  }

  const violations = computeViolations(rows);

  const report = {
    checkedAt: new Date().toISOString(),
    totalSecurityDefiner: rows.length,
    violations: violations.map((r) => ({
      function_name: r.function_name,
      arguments: r.arguments,
      proconfig: r.proconfig,
    })),
  };

  if (violations.length > 0) {
    return concludeCheck({
      check: 'security-definer-audit',
      status: CHECK_RESULT_STATUS.FAILED,
      summary: `${violations.length} função(ões) SECURITY DEFINER sem search_path explícito (${rows.length} auditadas): ${violations
        .map((v) => v.function_name)
        .join(', ')}`,
      details: report,
    });
  }

  return concludeCheck({
    check: 'security-definer-audit',
    status: CHECK_RESULT_STATUS.PASSED,
    summary: `✅ SECURITY DEFINER audit OK — ${rows.length} função(ões) auditadas, todas com search_path`,
    details: report,
  });
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((e) => {
    process.stderr.write(`[security-definer-audit] erro: ${e.stack || e.message}\n`);
    process.exit(2);
  });
}
