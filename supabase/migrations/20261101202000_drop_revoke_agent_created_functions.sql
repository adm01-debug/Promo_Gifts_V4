-- SEC: funções criadas em 2026-11-01 pela sessão de auditoria, SECURITY DEFINER e executáveis por `authenticated`:
--  1) public.perf002_drop_unused_snapshot_indexes() — executa DDL (DROP INDEX montado por concatenação). Uso único, já cumprido
--     (os 7 índices não existem mais) -> DROP.
--  2) public.cleanup_expired_auth_sessions() — DELETE em auth.sessions (> 30 dias). É usada pelo cron job 312 (roda como postgres),
--     então a função fica; só perde EXECUTE de authenticated/anon/PUBLIC. service_role e postgres mantêm.
-- Rollback: ver supabase/rollbacks/20261101202000_rollback.sql (GRANT EXECUTE de volta em cleanup_expired_auth_sessions; função de DDL não deve ser recriada).
-- Verificação pós-apply: SELECT count(*) FROM pg_proc WHERE proname='perf002_drop_unused_snapshot_indexes'; -- 0
--   SELECT has_function_privilege('authenticated','public.cleanup_expired_auth_sessions()','EXECUTE'); -- false

DROP FUNCTION IF EXISTS public.perf002_drop_unused_snapshot_indexes();

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_auth_sessions() FROM PUBLIC, anon, authenticated;
