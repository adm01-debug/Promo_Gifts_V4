-- T35-fix: Corrige RLS quebrada em material_groups (bug no T25b)
-- Problema: subquery referenciava material_groups.organization_id dentro de FROM profiles
--           → condição sempre verdadeira para qualquer usuário autenticado com profile
-- Correção: usa current_setting('app.current_org_id') como nas outras isolation policies

ALTER POLICY "mg_select" ON public.material_groups
  USING (
    organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid
  );

ALTER POLICY "mg_insert" ON public.material_groups
  WITH CHECK (
    organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid
  );

ALTER POLICY "mg_update" ON public.material_groups
  USING (
    organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid
  )
  WITH CHECK (
    organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid
  );

ALTER POLICY "mg_delete" ON public.material_groups
  USING (
    organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid
  );
