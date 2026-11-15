-- PERF-002: Agendamento one-shot do cron job para executar a função auxiliar
-- O pg_cron executa SELECT public.perf002_drop_unused_snapshot_indexes() fora de transação.
-- ROLLBACK: N/A — job executou e foi removido em 20261101194940_perf002_unschedule_cron.sql

SELECT cron.schedule('perf002-drop-indexes-once', '* * * * *', 'SELECT public.perf002_drop_unused_snapshot_indexes()');
