-- Rollback: 20261112120700_fix_grant_fn_admin_sync_external_connections
-- Volta ao estado anterior de producao (exec_api=service_role): o botao "Executar sync"
-- de /admin/conexoes volta a receber 42501. service_role, PUBLIC e anon ficam como estavam.

REVOKE EXECUTE ON FUNCTION public.fn_admin_sync_external_connections() FROM authenticated;
