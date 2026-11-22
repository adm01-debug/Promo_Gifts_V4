-- Rollback de 20261122200000_fix_cadeia_views_compras_e_compositions.sql.
-- Devolve o estado byte a byte anterior:
--   (A) public.mv_product_compositions volta para security_invoker=true
--   (B) revoga os GRANTs minimos concedidos a anon
--
-- ATENCAO: aplicar isto RE-QUEBRA em producao as 2 views que ainda falhavam
--   v_product_compositions_public -> 401 42501 ... materialized view mv_product_compositions
--   v_compras_precos_variante     -> 401 42501 ... table variant_supplier_sources
-- Os COMMENT ON VIEW anteriores nao sao restaurados por este rollback.

alter view public.mv_product_compositions set (security_invoker = true);

revoke select on table public.vw_variant_sale_prices from anon;
revoke select on table public.variant_supplier_sources from anon;
revoke select on table public.markup_configurations from anon;
revoke select (default_markup_percent) on table public.suppliers from anon;
