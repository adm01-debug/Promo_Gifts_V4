-- MELHORIA 5: material_groups nao tinha FK para organizations (material_types e
-- material_variations tinham). Fechando a integridade referencial, mesmo padrao
-- dos irmaos: ON DELETE CASCADE.
ALTER TABLE public.material_groups
  ADD CONSTRAINT material_groups_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;;
