-- Rollback da migration 20261101202000_drop_revoke_agent_created_functions.sql
-- Reversao deliberadamente fail-closed:
-- 1) cleanup_expired_auth_sessions() ja estava revogada para PUBLIC/anon/authenticated
--    pela migration 20261101202426 antes deste cleanup. Reabrir EXECUTE seria uma
--    regressao de seguranca, nao a restauracao do estado anterior.
-- 2) perf002_drop_unused_snapshot_indexes() nao e recriada: era uma funcao DDL de
--    uso unico, ja executada, e sua definicao original nao esta versionada.
--
-- Mantem explicitamente o ACL seguro e pode ser executada repetidamente.

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_auth_sessions() FROM PUBLIC, anon, authenticated;
