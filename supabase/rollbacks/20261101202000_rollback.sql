-- Rollback: 20261101202000_drop_revoke_agent_created_functions.sql
-- (2) Devolve EXECUTE a authenticated na função de limpeza de sessões (não recomendado: permite a qualquer usuário logado apagar sessões > 30 dias).
GRANT EXECUTE ON FUNCTION public.cleanup_expired_auth_sessions() TO authenticated;
-- (1) perf002_drop_unused_snapshot_indexes() NÃO deve ser recriada: era de uso único (DDL por SQL concatenado) e os 7 índices já foram removidos.
--     Se for indispensável, o corpo está em 20261101194657_perf002_fn_drop_indexes_obfuscated.sql; recriar sem GRANT para authenticated.
