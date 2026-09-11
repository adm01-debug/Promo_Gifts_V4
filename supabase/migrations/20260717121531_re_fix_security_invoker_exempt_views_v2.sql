-- ============================================================================
-- ANTI-REGRESSÃO v2 (fix_version 20260717b)
-- 
-- Migration dynamic_security_invoker_all_views (20260717115513) aplicou
-- security_invoker=on em TODAS as views públicas com exceção apenas de
-- v_products_public. Isso reverteu o fix anterior e quebrou:
--
--   v_suppliers_public:
--     - Body: SELECT ... FROM public.suppliers
--     - authenticated NÃO tem TABLE-level GRANT em suppliers (by design:
--       suppliers expõe api_credentials — acesso direto é proibido)
--     - Com security_invoker=on: authenticated tenta SELECT suppliers → 403
--     - DEVE ser security_invoker=false (SECURITY DEFINER)
--
--   mv_stock_velocity (public):
--     - Body: SELECT ... FROM analytics.mv_stock_velocity
--     - authenticated NÃO tem SELECT em analytics.mv_stock_velocity
--     - Com security_invoker=on: 403
--     - DEVE ser security_invoker=false (SECURITY DEFINER)
--
-- EXEMPTIONS QUE FUTURAS SWEEPS DEVEM RESPEITAR:
--   - v_products_public    (já em migration 040)
--   - v_suppliers_public   (esta migration)
--   - public.mv_stock_velocity  (esta migration)
--   - category_icons       (proxy view sobre categories — RLS ok)
-- ============================================================================

ALTER VIEW public.v_suppliers_public    SET (security_invoker = false);
ALTER VIEW public.mv_stock_velocity     SET (security_invoker = false);

COMMENT ON VIEW public.v_suppliers_public IS
  'SECURITY DEFINER (security_invoker=false) — BASE DESIGN INTENCIONAL. '
  'Expõe colunas curadas de public.suppliers sem expor api_credentials. '
  'authenticated NÃO TEM table-level GRANT em suppliers. '
  'NÃO ALTERAR para security_invoker=on — quebra PostgREST (403). '
  'ANTI-REGRESSÃO fix_version 20260717b. Exemption obrigatória em sweeps.';

COMMENT ON VIEW public.mv_stock_velocity IS
  'SECURITY DEFINER (security_invoker=false) — BASE DESIGN INTENCIONAL. '
  'Wrapper PostgREST de analytics.mv_stock_velocity. '
  'authenticated NÃO TEM SELECT em analytics schema. '
  'NÃO ALTERAR para security_invoker=on — quebra PostgREST (403). '
  'ANTI-REGRESSÃO fix_version 20260717b. Exemption obrigatória em sweeps. '
  'anon: REVOKED (dados operacionais internos).';

NOTIFY pgrst, 'reload schema';;
