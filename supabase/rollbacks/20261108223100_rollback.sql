-- Rollback: 20261108223100_drop_perf002_incident_ddl_survivor.sql
-- A função perf002_drop_unused_snapshot_indexes() foi criada pelo incidente
-- PEND-I01 e NÃO deve ser recriada. Este rollback é no-op intencional.
-- Para referência histórica do DDL original, ver SHA f7485a495fa291496d1b20c7ee051e6396d0ade3
-- (supabase/migrations/20261101202000_drop_revoke_agent_created_functions.sql).
SELECT 1; -- rollback intencional vazio: função de DDL ofuscado não deve ser restaurada
