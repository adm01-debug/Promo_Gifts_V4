-- ============================================================
-- FIX P0: Restaura grants de leitura pública (anon/authenticated)
-- em v_products_public / v_suppliers_public e objetos-base.
--
-- CAUSA-RAIZ: views são security_invoker=true → o papel chamador
-- precisa de SELECT na VIEW e em CADA objeto-base. Os grants de
-- anon (e de authenticated em suppliers + mv_product_leaf_category)
-- sumiram — provável DROP+CREATE da matview (descarta grants) ou
-- REVOKE em massa. As políticas RLS já permitem anon/authenticated;
-- faltava só a camada de PRIVILÉGIO, que é checada ANTES do RLS.
--   -> resultado: PostgREST 42501 -> HTTP 403 em todo o catálogo.
--
-- ANTI-REGRESSÃO: se mv_product_leaf_category precisar ser
-- reconstruída, use REFRESH MATERIALIZED VIEW (preserva grants),
-- NUNCA DROP+CREATE.
-- fix_version: 20260717_grants_public_views_v1
-- ============================================================

GRANT SELECT ON public.products                  TO anon;                 -- authenticated já possuía
GRANT SELECT ON public.suppliers                 TO anon, authenticated;
GRANT SELECT ON public.mv_product_leaf_category  TO anon, authenticated;
GRANT SELECT ON public.v_products_public         TO anon;                 -- authenticated já possuía
GRANT SELECT ON public.v_suppliers_public        TO anon;                 -- authenticated já possuía

COMMENT ON VIEW public.v_products_public IS
  'Catalogo publico (security_invoker=true). Exige SELECT p/ anon+authenticated em products + mv_product_leaf_category. fix_version 20260717_grants_public_views_v1 - NAO revogar; recriar matview via REFRESH, nunca DROP+CREATE.';
COMMENT ON VIEW public.v_suppliers_public IS
  'Fornecedores publicos (security_invoker=true). Exige SELECT p/ anon+authenticated em suppliers. fix_version 20260717_grants_public_views_v1 - NAO revogar grants.';

NOTIFY pgrst, 'reload schema';;
