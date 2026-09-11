-- ============================================================================
-- fix_version: 20260717_grant_anon_catalog_rpcs_v1
-- ANTI-REGRESSÃO: o storefront DESLOGADO precisa de EXECUTE nestas RPCs para
-- busca/filtro/facetas/preço/bestseller. A campanha de hardening (advisors)
-- revogou anon em massa e quebrou o catálogo anônimo. Cada função foi auditada:
--   - fn_super_filtro: cost_price = NULL hardcoded no corpo (não vaza custo)
--   - fn_global_search: ramo 'quote' gated por auth.uid() IS NOT NULL (anon = só produtos)
--   - facets/price_range: só agregados de sale_price, filtram is_active
--   - get_catalog_bestseller_page: RETURNS SETOF v_products_public (saída pública por tipo)
-- NÃO conceder get_promo_sales_ranking ao anon: expõe volume bruto de vendas/produto.
-- Se um bot/migração revogar de novo, RE-CONCEDER apenas estes 5 (nunca sales_ranking).
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.fn_super_filtro             TO anon;
GRANT EXECUTE ON FUNCTION public.fn_super_filtro_facets      TO anon;
GRANT EXECUTE ON FUNCTION public.fn_super_filtro_price_range TO anon;
GRANT EXECUTE ON FUNCTION public.fn_global_search            TO anon;
GRANT EXECUTE ON FUNCTION public.get_catalog_bestseller_page TO anon;

COMMENT ON FUNCTION public.fn_super_filtro IS
  'Catálogo/filtro storefront. anon EXECUTE OK (cost_price=NULL hardcoded). fix_version 20260717_grant_anon_catalog_rpcs_v1. ANTI-REGRESSAO: nao revogar anon.';
COMMENT ON FUNCTION public.fn_global_search IS
  'Busca global. anon EXECUTE OK (quotes gated por auth.uid() IS NOT NULL). fix_version 20260717_grant_anon_catalog_rpcs_v1. ANTI-REGRESSAO: nao revogar anon.';
COMMENT ON FUNCTION public.get_promo_sales_ranking IS
  'Ranking de vendas (volume bruto). SOMENTE authenticated/service_role. ANTI-REGRESSAO: NAO conceder anon (vaza metrica de negocio). Bestseller anon usa get_catalog_bestseller_page.';

NOTIFY pgrst, 'reload schema';;
