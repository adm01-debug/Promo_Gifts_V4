-- ============================================================================
-- fix_version: 20260717_grant_anon_public_views_v2
-- Item 2: habilita as 9 views _public (security_invoker) para anon no storefront
-- deslogado (detalhe de produto: nuances de cor, kit, técnicas, composição, specs, tags).
-- Todas as bases são não-sensíveis; NENHUMA toca markup/cost/variant_supplier_sources.
-- Aplicado via apply_migration (durável). ANTI-REGRESSAO: re-aplicar se revogado.
-- ============================================================================

-- (A) Re-escopar políticas org (public->authenticated): o check user_belongs_to_org()
--     lê user_organizations (sem grant p/ anon) e ERRA na avaliação p/ anon.
--     O check só faz sentido p/ logado; service_role tem BYPASSRLS (neutro).
ALTER POLICY product_tags_select_org ON public.product_tags TO authenticated;
ALTER POLICY tags_select_org         ON public.tags         TO authenticated;

-- (B) Políticas anon escopadas (catálogo público ativo)
DROP POLICY IF EXISTS color_nuances_anon_read ON public.color_nuances;
CREATE POLICY color_nuances_anon_read ON public.color_nuances
  FOR SELECT TO anon USING (is_active = true);

DROP POLICY IF EXISTS kit_component_print_areas_anon_read ON public.kit_component_print_areas;
CREATE POLICY kit_component_print_areas_anon_read ON public.kit_component_print_areas
  FOR SELECT TO anon USING (is_active = true);

DROP POLICY IF EXISTS personalization_techniques_anon_read ON public.personalization_techniques;
CREATE POLICY personalization_techniques_anon_read ON public.personalization_techniques
  FOR SELECT TO anon USING (is_active = true);

DROP POLICY IF EXISTS tags_anon_read ON public.tags;
CREATE POLICY tags_anon_read ON public.tags
  FOR SELECT TO anon USING (is_active = true);

DROP POLICY IF EXISTS product_properties_anon_read ON public.product_properties;
CREATE POLICY product_properties_anon_read ON public.product_properties
  FOR SELECT TO anon USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_properties.product_id AND p.is_active = true AND p.is_deleted IS NOT TRUE));

DROP POLICY IF EXISTS product_tags_anon_read ON public.product_tags;
CREATE POLICY product_tags_anon_read ON public.product_tags
  FOR SELECT TO anon USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_tags.product_id AND p.is_active = true AND p.is_deleted IS NOT TRUE));

-- (C) Grants nas bases não-sensíveis
GRANT SELECT ON public.color_nuances              TO anon;
GRANT SELECT ON public.kit_component_print_areas  TO anon;
GRANT SELECT ON public.personalization_techniques TO anon;
GRANT SELECT ON public.product_properties         TO anon;
GRANT SELECT ON public.tags                       TO anon;
GRANT SELECT ON public.product_tags               TO anon;
GRANT SELECT ON public.mv_product_compositions    TO anon;   -- view wrapper

-- (D) Cross-schema analytics (matview de composição; 'analytics' não é exposto no PostgREST)
GRANT USAGE  ON SCHEMA analytics                  TO anon;
GRANT SELECT ON analytics.mv_product_compositions TO anon;

-- (E) Grants nas 9 views _public
GRANT SELECT ON public.v_color_nuances_public             TO anon;
GRANT SELECT ON public.v_kit_component_media_public       TO anon;
GRANT SELECT ON public.v_kit_component_print_areas_public TO anon;
GRANT SELECT ON public.v_personalization_techniques_public TO anon;
GRANT SELECT ON public.v_print_area_techniques_public     TO anon;
GRANT SELECT ON public.v_product_compositions_public      TO anon;
GRANT SELECT ON public.v_product_properties_public        TO anon;
GRANT SELECT ON public.v_product_tags_public              TO anon;
GRANT SELECT ON public.v_tags_public                      TO anon;

NOTIFY pgrst, 'reload schema';;
