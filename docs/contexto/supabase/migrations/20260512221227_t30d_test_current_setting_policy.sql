ALTER POLICY "color_groups_isolation" ON public.color_groups
  USING ((organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid));
