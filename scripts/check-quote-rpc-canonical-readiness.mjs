#!/usr/bin/env node
/**
 * Bloqueia a promocao do consumidor transacional de orcamentos enquanto o
 * projeto canonico ainda expuser o contrato destrutivo anterior.
 *
 * O check e somente leitura: consulta pg_catalog pela Management API ou le um
 * fixture explicito. Em modo --require-live, ausencia de credencial/evidencia
 * termina como inconclusiva (exit 2), nunca como aprovacao silenciosa.
 */
import { readFileSync } from 'node:fs';
import { CHECK_RESULT_STATUS, concludeCheck, shouldRequireLive } from './check-result-contract.mjs';
import { querySupabaseReadOnly } from './supabase-read-only-query.mjs';

const CHECK = 'Quote RPC canonical readiness';
const CANONICAL_PROJECT_REF = 'doufsxqlfjyuvxuezpln';
const REQUIRE_LIVE = shouldRequireLive();
const FROM_FILE = process.argv.find((arg) => arg.startsWith('--from-file='));

const SQL = `
SELECT
  p.oid::regprocedure::text AS signature,
  md5(p.prosrc) AS body_md5,
  NOT p.prosecdef AS security_invoker,
  pg_get_userbyid(p.proowner) AS owner,
  coalesce(array_to_string(p.proconfig, ','), '') AS proconfig,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_execute,
  position('product_variant_id' IN p.prosrc) > 0 AS has_product_variant_id,
  position('product_description' IN p.prosrc) > 0 AS has_product_description,
  position('artwork_urls' IN p.prosrc) > 0 AS has_artwork_urls,
  position('mockup_urls' IN p.prosrc) > 0 AS has_mockup_urls,
  position('selected_packaging_id' IN p.prosrc) > 0 AS has_selected_packaging_id,
  position('_removed_item_ids' IN p.prosrc) > 0 AS has_removed_item_ids,
  position('Version must advance exactly once' IN p.prosrc) > 0 AS has_exact_version_guard,
  position('explicit_client_version_bump_v1' IN p.prosrc) > 0 AS has_explicit_bump,
  position('FOR UPDATE' IN p.prosrc) > 0 AS has_row_lock
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.oid IN (
    to_regprocedure('public.create_quote_transactional(jsonb,jsonb)'),
    to_regprocedure('public.increment_quote_version()'),
    to_regprocedure('public.update_quote_transactional(uuid,jsonb,jsonb,integer)')
  )
ORDER BY signature;
`.trim();

const CONTRACTS = {
  'create_quote_transactional(jsonb,jsonb)': {
    bodyMd5: '54d09802f6eaf0504a09e30cd2ce30c7',
    proconfig: 'search_path=public',
    markers: [
      'has_product_variant_id',
      'has_product_description',
      'has_artwork_urls',
      'has_mockup_urls',
      'has_selected_packaging_id',
    ],
  },
  'increment_quote_version()': {
    bodyMd5: 'f1ebe660a6db383225a8d885642759b1',
    proconfig: 'search_path=pg_catalog, public',
    markers: ['has_explicit_bump'],
  },
  'update_quote_transactional(uuid,jsonb,jsonb,integer)': {
    bodyMd5: '40613079070aceb2054b4c7124cffe12',
    proconfig: 'search_path=public',
    markers: [
      'has_product_variant_id',
      'has_product_description',
      'has_artwork_urls',
      'has_mockup_urls',
      'has_selected_packaging_id',
      'has_removed_item_ids',
      'has_exact_version_guard',
      'has_row_lock',
    ],
  },
};

function conclude(status, reason, summary, details = {}) {
  concludeCheck({
    check: CHECK,
    status,
    summary,
    details: { reason, requireLive: REQUIRE_LIVE, ...details },
  });
}

function validate(rows) {
  const bySignature = new Map(rows.map((row) => [row.signature, row]));
  const issues = [];

  for (const [signature, contract] of Object.entries(CONTRACTS)) {
    const row = bySignature.get(signature);
    if (!row) {
      issues.push(`${signature}: ausente`);
      continue;
    }
    if (row.body_md5 !== contract.bodyMd5) issues.push(`${signature}: corpo SQL divergente`);
    if (row.security_invoker !== true) issues.push(`${signature}: nao e SECURITY INVOKER`);
    if (row.owner !== 'postgres') issues.push(`${signature}: owner inesperado`);
    if (row.proconfig !== contract.proconfig) issues.push(`${signature}: search_path divergente`);
    if (row.authenticated_execute !== true) issues.push(`${signature}: authenticated sem EXECUTE`);
    if (row.service_role_execute !== true) issues.push(`${signature}: service_role sem EXECUTE`);
    for (const marker of contract.markers) {
      if (row[marker] !== true) issues.push(`${signature}: marcador ${marker} ausente`);
    }
  }

  for (const row of rows) {
    if (!Object.hasOwn(CONTRACTS, row.signature)) {
      issues.push(`${row.signature}: overload inesperado no resultado`);
    }
  }
  return issues;
}

async function loadRows() {
  if (FROM_FILE) {
    const path = FROM_FILE.slice('--from-file='.length);
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    const rows = Array.isArray(parsed) ? parsed : parsed.rows;
    if (!Array.isArray(rows)) throw new Error('fixture precisa conter um array rows');
    return { kind: 'fixture', rows };
  }

  if (process.env.SUPABASE_PROJECT_REF !== CANONICAL_PROJECT_REF) {
    return { kind: 'wrong-project' };
  }
  return querySupabaseReadOnly(SQL);
}

async function main() {
  let result;
  try {
    result = await loadRows();
  } catch {
    return conclude(
      CHECK_RESULT_STATUS.INCONCLUSIVE,
      'invalid_fixture_or_query',
      'Nao foi possivel produzir evidencia verificavel do contrato canonico.',
    );
  }

  if (result.kind === 'wrong-project') {
    return conclude(
      CHECK_RESULT_STATUS.FAILED,
      'wrong_project',
      'O gate recusou consultar um projeto diferente do Supabase canonico.',
    );
  }
  if (result.kind === 'missing-config') {
    return conclude(
      REQUIRE_LIVE ? CHECK_RESULT_STATUS.INCONCLUSIVE : CHECK_RESULT_STATUS.STATIC_PASS,
      'missing_credentials',
      REQUIRE_LIVE
        ? 'Credenciais read-only ausentes; prontidao canonica nao comprovada.'
        : 'Sem credenciais read-only; verificacao permaneceu explicitamente estatica.',
    );
  }
  if (result.kind !== 'live' && result.kind !== 'fixture') {
    return conclude(
      CHECK_RESULT_STATUS.INCONCLUSIVE,
      result.kind,
      'A consulta read-only do contrato canonico nao produziu evidencia conclusiva.',
      { httpStatus: result.httpStatus ?? null },
    );
  }

  const issues = validate(result.rows);
  const hashes = Object.fromEntries(
    result.rows.map((row) => [row.signature, row.body_md5 ?? null]),
  );
  if (issues.length > 0) {
    return conclude(
      CHECK_RESULT_STATUS.FAILED,
      'canonical_contract_not_applied',
      'O Supabase canonico ainda nao atende ao contrato transacional exigido pelo frontend.',
      { issues, observedBodyMd5: hashes, source: result.kind },
    );
  }

  return conclude(
    CHECK_RESULT_STATUS.PASSED,
    'canonical_contract_verified',
    'As tres funcoes canonicas atendem ao contrato transacional e de concorrencia revisado.',
    { signatures: Object.keys(CONTRACTS), observedBodyMd5: hashes, source: result.kind },
  );
}

main();
