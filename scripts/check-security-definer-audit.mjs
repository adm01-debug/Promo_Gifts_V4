#!/usr/bin/env node
/**
 * check-security-definer-audit.mjs
 * Gate 5 — CHECK 2: audita ACLs de funcoes SECURITY DEFINER em public.
 *
 * Falha (exit 1) para grants públicos não reconhecidos pelo contrato canônico.
 *
 * Usa fetch nativo (Node 18+) para chamar o endpoint REST do Supabase,
 * evitando a dependência do cliente realtime que requer WebSocket (Node 22+).
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('SUPABASE_URL e SUPABASE_SERVICE_KEY sao obrigatorios.');
  process.exit(1);
}

const url = `${SUPABASE_URL}/rest/v1/rpc/audit_security_definer_acl`;
let data;
try {
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!resp.ok) {
    const text = await resp.text();
    console.error(`Erro HTTP ${resp.status} ao chamar audit_security_definer_acl: ${text}`);
    process.exit(1);
  }
  data = await resp.json();
} catch (err) {
  console.error('Erro ao executar audit_security_definer_acl:', err.message);
  process.exit(1);
}

// fn_product_active_for_rls(uuid) is deliberately executable by anon: two
// catalog RLS policies call it without granting anon direct SELECT on products.
// The canonical fn_verify_anon_catalog_grants() tripwire also requires this
// grant. Keep the exception signature- and finding-specific so no unrelated
// SECURITY DEFINER finding is suppressed.
const intentionalFindings = new Set([
  'fn_product_active_for_rls|p_id uuid|anon has EXECUTE (not in public-intent whitelist)|anon',
  // SEC-009 (2026-09-04): substituto seguro de get_quote_token_by_value — expõe só campos não-PII
  'get_quote_token_public|_token text|anon has EXECUTE (not in public-intent whitelist)|anon',
]);

const findingKey = (row) => [
  row.function_name,
  row.arguments,
  row.problem,
  row.granted_to,
].join('|');

const findings = (data ?? []).filter((row) => row.problem && row.problem.length > 0);
const tolerated = findings.filter((row) => intentionalFindings.has(findingKey(row)));
const problems = findings.filter((row) => !intentionalFindings.has(findingKey(row)));

if (tolerated.length > 0) {
  console.log('ℹ️  SECURITY DEFINER grants intencionais confirmados:');
  tolerated.forEach((row) => {
    console.log(`  - ${row.function_name}(${row.arguments}): ${row.problem}`);
  });
}

if (problems.length > 0) {
  console.error('\n❌ ACLs SECURITY DEFINER não autorizadas:');
  problems.forEach((row) => {
    console.error(`  - ${row.function_name}(${row.arguments}): ${row.problem}`);
  });
  console.error('\nRevise os grants e a intenção pública das funções acima.');
  process.exit(1);
}

console.log(`✅ SECURITY DEFINER audit OK — nenhum problema encontrado em ${(data ?? []).length} funcoes.`);
process.exit(0);
