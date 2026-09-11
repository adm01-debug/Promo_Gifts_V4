-- ============================================================================
-- Revogar EXECUTE de PUBLIC/anon das funções de event trigger
-- Event triggers são executadas pelo sistema PostgreSQL (superusuário),
-- não por usuários comuns — PUBLIC EXECUTE é desnecessário e é superfície.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.fn_auto_revoke_secdef_public_execute() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_revoke_view_write_grants_on_create() FROM PUBLIC, anon;
;
