-- Fix SEC: REVOKE EXECUTE em cleanup_expired_auth_sessions() de PUBLIC/authenticated/anon
-- Severidade: ALTO | Tipo: SEGURANÇA
-- Bug: migration 20261101192817 criou função SECURITY DEFINER sem REVOKE explícito.
-- Qualquer usuário autenticado podia invocar via RPC e deletar sessões de todos os usuários.
-- Evidência: SELECT has_function_privilege('authenticated', 'public.cleanup_expired_auth_sessions()', 'EXECUTE');
--            → t (antes deste fix)
-- ROLLBACK: GRANT EXECUTE ON FUNCTION public.cleanup_expired_auth_sessions() TO authenticated;
--           (não recomendado — esta função deve ser chamada só pelo cron)

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_auth_sessions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_auth_sessions() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_auth_sessions() FROM anon;
