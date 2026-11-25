-- Rollback de 20260917150000 (E40 - snapshot semanal de pg_stat_statements).
SELECT cron.unschedule('pgss-history-weekly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pgss-history-weekly');

DROP TABLE IF EXISTS ops.pgss_history;
