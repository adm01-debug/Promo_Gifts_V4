-- Fix remaining 5 auth_rls_initplan violations
-- Wrap bare current_setting() and auth.role() in (SELECT ...) for init-plan optimization

ALTER POLICY "color_nuances_isolation" ON public.color_nuances
  USING ((organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid));

ALTER POLICY "color_variations_isolation" ON public.color_variations
  USING ((organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid));

ALTER POLICY "material_groups_isolation" ON public.material_groups
  USING ((organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid));

ALTER POLICY "product_materials_isolation" ON public.product_materials
  USING ((organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid));

ALTER POLICY "notification_templates_select" ON public.notification_templates
  USING (((SELECT auth.role()) = 'authenticated'::text));

-- Clean up test index created during debugging
DROP INDEX IF EXISTS public.idx_test_t30c_probe;
