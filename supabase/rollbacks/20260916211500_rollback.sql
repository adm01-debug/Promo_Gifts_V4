-- Rollback de 20260916211500 (E30 - serie historica de tamanho de tabelas).
-- Ordem inversa da migration: cron -> tabela -> schema.
SELECT cron.unschedule('table-size-history-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'table-size-history-daily');

DROP TABLE IF EXISTS ops.table_size_history;

-- O schema `ops` tambem hospeda ops.pgss_history (E40, 20260917150000) e
-- ops.wraparound_monitor_log (E33, 20260917160000). Sem CASCADE o DROP falha
-- se elas ainda existirem - reverta as duas antes deste ponto.
DROP SCHEMA IF EXISTS ops;
