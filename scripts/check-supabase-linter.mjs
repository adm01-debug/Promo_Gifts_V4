#!/usr/bin/env node
/**
 * Gate de CI: usa os Security Advisors da Management API e os gates de
 * pg_catalog. O endpoint antigo /database/lint passou a responder 404.
 * Falha fechado se os Advisors estiverem indisponíveis, se aparecer um ERROR
 * não revisado ou se qualquer gate específico do catálogo falhar.
 * Os WARN/INFO dos Advisors são reportados, mas requerem triagem separada;
 * este gate NÃO equivale a zero findings no Supabase.
 *
 * Env obrigatórias:
 *   SUPABASE_ACCESS_TOKEN  (PAT — Settings → Access Tokens)
 *   SUPABASE_PROJECT_REF   (ex.: doufsxqlfjyuvxuezpln)
 *
 * UPDATE_BASELINE=1 é recusado: a baseline histórica do endpoint legado não
 * corresponde ao payload atual. Exceções novas exigem revisão por objeto.
 *
 * Saída:
 *   exit 0 — sem regressões
 *   exit 1 — ERROR não revisado ou gate específico do catálogo falhou
 *   exit 2 — erro de config/rede
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;
const UPDATE = process.env.UPDATE_BASELINE === "1";
const CANONICAL_REF = "doufsxqlfjyuvxuezpln";

const CATALOG_CHECKS = [
  "check-lint-0011-drift.mjs",
  "check-lint-0029-drift.mjs",
  "check-secdef-anon-drift.mjs",
  "check-anon-write-grants.mjs",
  "check-public-views-drift.mjs",
];

// pg_catalog confirmou security_invoker=false e comentários de intenção para
// estas projeções públicas em 2026-09-22. Alterar para security_invoker=true
// sem redesenhar as grants/RLS das tabelas-base quebraria as projeções ou
// poderia expor dados sensíveis. Uma view nova deve bloquear o gate.
const REVIEWED_SECURITY_DEFINER_VIEWS = new Set([
  "public.v_kit_component_media_public",
  "public.v_product_compositions_public",
  "public.v_product_properties_public",
  "public.v_product_tags_public",
  "public.v_products_public",
  "public.v_suppliers_public",
  "public.v_tabela_preco_gravacao_oficial_public",
  "public.v_variant_sale_prices_public",
]);

export function runCatalogChecks({ spawn = spawnSync, logger = console } = {}) {
  for (const script of CATALOG_CHECKS) {
    const result = spawn(process.execPath, [resolve("scripts", script), "--require-live"], {
      env: process.env,
      stdio: "inherit",
      timeout: 30_000,
    });
    if (result.error || result.status !== 0) {
      logger.error(`❌ Auditoria pg_catalog falhou em ${script}.`);
      return result.status === 1 ? 1 : 2;
    }
  }
  logger.log(`✅ Auditoria pg_catalog: ${CATALOG_CHECKS.length} verificações live concluídas.`);
  return 0;
}

export async function runLinter({
  token = TOKEN,
  ref = REF,
  fetcher = fetch,
  catalogRunner = runCatalogChecks,
  logger = console,
} = {}) {
  if (!token || !ref) {
    logger.error("❌ SUPABASE_ACCESS_TOKEN e SUPABASE_PROJECT_REF são obrigatórios.");
    return 2;
  }
  if (ref !== CANONICAL_REF) {
    logger.error(`❌ Projeto errado: este gate só audita ${CANONICAL_REF}.`);
    return 2;
  }

  let response;
  try {
    response = await fetcher(`https://api.supabase.com/v1/projects/${encodeURIComponent(ref)}/advisors/security`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    logger.error(`❌ Linter indisponível (${error.name || "erro de rede"}).`);
    return 2;
  }

  if (!response.ok) {
    logger.error(`❌ Security Advisors indisponíveis: Management API ${response.status} ${response.statusText}`);
    return 2;
  }

  let findings;
  try {
    findings = await response.json();
  } catch {
    logger.error("❌ Management API retornou JSON inválido.");
    return 2;
  }
  if (!findings || !Array.isArray(findings.lints)) {
    logger.error("❌ Management API não retornou o objeto { lints: [...] } esperado.");
    return 2;
  }
  if (UPDATE) {
    logger.error("❌ UPDATE_BASELINE=1 não é compatível com os Advisors atuais; revise as exceções por objeto.");
    return 2;
  }
  const errors = findings.lints.filter((finding) => finding?.level === "ERROR");
  const unreviewed = errors.filter((finding) => {
    const object = `${finding.metadata?.schema || ""}.${finding.metadata?.name || ""}`;
    return finding.name !== "security_definer_view" || !REVIEWED_SECURITY_DEFINER_VIEWS.has(object);
  });
  const warnings = findings.lints.filter((finding) => finding?.level === "WARN").length;
  logger.log(`📊 Security Advisors: ${findings.lints.length} findings (${errors.length} ERROR, ${warnings} WARN); ${unreviewed.length} ERROR não revisados.`);
  if (warnings) logger.warn("⚠️ WARN/INFO não são cobertos integralmente por este gate; consulte o advisor e os gates específicos.");
  for (const finding of unreviewed) {
    logger.error(`❌ ${finding.name}: ${finding.metadata?.schema || "?"}.${finding.metadata?.name || "?"}`);
  }
  if (unreviewed.length) return 1;
  return catalogRunner();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exitCode = await runLinter();
}
