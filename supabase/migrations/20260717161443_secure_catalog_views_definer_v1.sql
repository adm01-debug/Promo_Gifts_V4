-- ============================================================================
-- fix_version: 20260717_secure_catalog_views_definer_v1
-- Converte para SECURITY DEFINER as 5 views _public que dependem de products
-- (v_kit_component_media, v_kit_component_print_areas, v_product_compositions,
--  v_product_properties, v_product_tags). Com security_invoker=true e products
-- revogado do anon, essas views quebravam. Com DEFINER, rodam como owner e lêem
-- products internamente (para filtro is_active) sem expor cost_price ao anon.
-- As colunas de output (kit media, print areas, compositions, properties, tags)
-- NÃO contêm dados financeiros ou operacionais sensíveis (confirmado por inspeção).
-- ANTI-REGRESSAO: NAO reverter para security_invoker=true sem rever dependência de products.
-- ============================================================================
ALTER VIEW public.v_kit_component_media_public       SET (security_invoker = false);
ALTER VIEW public.v_kit_component_print_areas_public SET (security_invoker = false);
ALTER VIEW public.v_product_compositions_public      SET (security_invoker = false);
ALTER VIEW public.v_product_properties_public        SET (security_invoker = false);
ALTER VIEW public.v_product_tags_public              SET (security_invoker = false);

COMMENT ON VIEW public.v_kit_component_media_public IS
  'SECURITY DEFINER intencional (fix_version 20260717). Depende de products para '
  'filtro is_active. Colunas de output: kit_component_id, component_code/name, primary_image_url.';
COMMENT ON VIEW public.v_kit_component_print_areas_public IS
  'SECURITY DEFINER intencional (fix_version 20260717). Colunas: áreas de impressão do kit.';
COMMENT ON VIEW public.v_product_compositions_public IS
  'SECURITY DEFINER intencional (fix_version 20260717). Depende de products e analytics.mv_product_compositions.';
COMMENT ON VIEW public.v_product_properties_public IS
  'SECURITY DEFINER intencional (fix_version 20260717). Colunas: property_code, property_value.';
COMMENT ON VIEW public.v_product_tags_public IS
  'SECURITY DEFINER intencional (fix_version 20260717). Colunas: product_id, tag_id.';

NOTIFY pgrst, 'reload schema';;
