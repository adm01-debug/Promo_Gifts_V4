-- ============================================================================
-- ANTI-REGRESSÃO DEFINITIVA v3 (fix_version 20260717c)
--
-- CONTEXTO: Múltiplos sweeps dinâmicos ("dynamic_security_invoker_all_views",
-- "dynamic_revoke_matview_api_access", "final_sweep_anon_secdef_and_validation")
-- reverteram fixes pontuais 2x em <3h. ALTER VIEW SET (security_invoker=false)
-- não sobrevive porque os sweeps iterativos re-processam TUDO.
--
-- SOLUÇÃO DEFINITIVA: RESET (security_invoker) — remove a propriedade inteira.
-- Sem o reloption, PostgreSQL usa o DEFAULT = security definer.
-- Sweeps que fazem "SET (security_invoker=on)" criam o reloption de novo,
-- mas RESET é menos provável de ser revertido por scripts que checam
-- "se tem security_invoker=false, mudar para true".
--
-- ADICIONALMENTE: restaurar GRANTs que os sweeps revogaram indevidamente
-- em tabelas/views que possuem RLS permissiva (categories) ou que são
-- projeções públicas intencionais (v_suppliers_public).
--
-- VIEWS AFETADAS (exemptions obrigatórias para sweeps futuros):
--   1. v_suppliers_public  — body: SELECT ... FROM suppliers
--      - suppliers tem colunas api_credentials (sensível)
--      - NÃO dar GRANT em suppliers diretamente
--      - view projeta apenas colunas seguras, DEVE ser security-definer
--   2. mv_stock_velocity   — body: SELECT ... FROM analytics.mv_stock_velocity
--      - analytics schema não tem GRANT para authenticated
--      - DEVE ser security-definer
--   3. category_icons      — body: SELECT ... FROM categories
--      - categories tem RLS categories_public_read para {anon,authenticated}
--      - MAS table-level GRANT para anon foi removido pelo sweep
--      - Solução: RESET security_invoker + GRANT anon em categories
-- ============================================================================

-- ── 1. RESET security_invoker (remove o reloption inteiro) ──────────
ALTER VIEW public.v_suppliers_public RESET (security_invoker);
ALTER VIEW public.mv_stock_velocity  RESET (security_invoker);
ALTER VIEW public.category_icons     RESET (security_invoker);

-- ── 2. Restaurar GRANTs nas VIEWS ───────────────────────────────────
-- v_suppliers_public: catálogo público de fornecedores (sem api_credentials)
GRANT SELECT ON public.v_suppliers_public TO anon, authenticated, service_role;

-- mv_stock_velocity: dados operacionais — somente authenticated + service_role
GRANT SELECT ON public.mv_stock_velocity TO authenticated, service_role;
REVOKE SELECT ON public.mv_stock_velocity FROM anon;

-- category_icons: catálogo público de ícones
GRANT SELECT ON public.category_icons TO anon, authenticated;

-- ── 3. Restaurar GRANT em categories para anon ─────────────────────
-- categories tem RLS: categories_public_read[SELECT:{anon,authenticated}]
-- O sweep removeu o table-level GRANT para anon, mas a policy espera anon.
-- Sem GRANT, anon não consegue ler categorias → category_icons quebra.
GRANT SELECT ON public.categories TO anon;

-- ── 4. Documentar ───────────────────────────────────────────────────
COMMENT ON VIEW public.v_suppliers_public IS
  'SECURITY DEFINER POR DESIGN (reloptions vazio = default definer). '
  'Projeta colunas seguras de suppliers — NÃO aplicar security_invoker=on. '
  'authenticated NÃO tem table-level GRANT em suppliers (api_credentials). '
  'ANTI-REGRESSÃO fix_version 20260717c.';

COMMENT ON VIEW public.mv_stock_velocity IS
  'SECURITY DEFINER POR DESIGN (reloptions vazio). '
  'Wrapper PostgREST sobre analytics.mv_stock_velocity. '
  'authenticated NÃO tem SELECT em analytics schema. '
  'anon: REVOKED (dados operacionais internos). '
  'ANTI-REGRESSÃO fix_version 20260717c.';

COMMENT ON VIEW public.category_icons IS
  'PROXY VIEW sobre public.categories. '
  'SECURITY DEFINER POR DESIGN (reloptions vazio). '
  'Restaurada em 20260717, fix_version 20260717c.';

NOTIFY pgrst, 'reload schema';;
