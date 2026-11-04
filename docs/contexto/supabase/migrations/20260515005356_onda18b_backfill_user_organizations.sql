-- =================================================================
-- Onda 18b: Backfill user_organizations
--
-- Contexto: 4 dos 8 usuarios em user_roles NAO estavam em user_organizations,
-- entre eles joaquim@ (admin/PO). Sem entrada em user_organizations, o user
-- nao consegue ver NENHUM orcamento (user_is_org_member retorna FALSE).
--
-- Gap pre-existente, descoberto durante validacao da Onda 18a.
--
-- Mapeamento app_role -> org_role:
--   - dev / admin -> org 'admin'
--   - vendedor / agente / supervisor / manager / coordenador -> org 'member'
--   - (existem owners ja cadastrados — nao mexer)
-- =================================================================

INSERT INTO public.user_organizations (user_id, organization_id, role)
SELECT
  ur.user_id,
  '5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid AS organization_id,
  CASE
    WHEN ur.role::text IN ('dev','admin') THEN 'admin'::org_role
    ELSE 'member'::org_role
  END AS role
FROM public.user_roles ur
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_organizations uo
  WHERE uo.user_id = ur.user_id
    AND uo.organization_id = '5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid
)
ON CONFLICT DO NOTHING;
