-- Vincula 9 usuários órfãos à organização Promo Brindes
-- cad01@ (Murilo Diniz) entra como admin
-- demais 8 (vendedores + teste QA) entram como member
-- Idempotente via NOT IN (se rodar de novo, não duplica)

INSERT INTO public.user_organizations (user_id, organization_id, role)
SELECT 
  u.id,
  '5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid AS organization_id,
  (CASE 
    WHEN u.email = 'cad01@promobrindes.com.br' THEN 'admin'
    ELSE 'member'
  END)::org_role AS role
FROM auth.users u
WHERE u.id NOT IN (SELECT user_id FROM public.user_organizations);
