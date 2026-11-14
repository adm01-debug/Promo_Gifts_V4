-- Rollback: 20261112120700_fix_grant_fn_admin_sync_external_connections
-- Volta ao estado anterior de producao: corpo admin-only (has_role 'admin') e exec_api=service_role;
-- o botao "Executar sync" de /admin/conexoes volta a receber 42501. PUBLIC e anon ficam como estavam.

CREATE OR REPLACE FUNCTION public.fn_admin_sync_external_connections()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF NOT public.has_role((SELECT auth.uid()), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN public.sync_external_connections_from_credentials();
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.fn_admin_sync_external_connections() FROM authenticated;
