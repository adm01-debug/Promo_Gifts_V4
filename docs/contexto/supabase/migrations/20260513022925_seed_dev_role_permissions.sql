INSERT INTO public.role_permissions (role, permission_code)
SELECT 'dev'::public.app_role, permission_code
FROM public.role_permissions
WHERE role = 'admin'::public.app_role
ON CONFLICT (role, permission_code) DO NOTHING;
