-- Rollback da migration 20261101202000_drop_revoke_agent_created_functions.sql
-- Restaura GRANT EXECUTE em cleanup_expired_auth_sessions para PUBLIC, anon e authenticated.
-- Nota: perf002_drop_unused_snapshot_indexes() nao e recriada -- era funcao DDL de uso unico,
-- ja aplicada antes de ser dropada. Recriar seria noop e nao ha script original disponivel.

GRANT EXECUTE ON FUNCTION public.cleanup_expired_auth_sessions() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_auth_sessions() TO anon;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_auth_sessions() TO authenticated;
