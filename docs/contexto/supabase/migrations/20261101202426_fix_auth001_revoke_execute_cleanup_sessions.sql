-- Fix SEC: REVOKE EXECUTE em cleanup_expired_auth_sessions() de PUBLIC/authenticated/anon
-- Bug: 20261101192817 criou função SECURITY DEFINER sem REVOKE explícito.
-- Qualquer usuário autenticado podia invocar via RPC e deletar todas as sessões.
-- ROLLBACK: GRANT EXECUTE ON FUNCTION public.cleanup_expired_auth_sessions() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_auth_sessions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_auth_sessions() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_auth_sessions() FROM anon;
