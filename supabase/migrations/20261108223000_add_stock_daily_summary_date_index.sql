-- transaction: none
-- (CREATE INDEX CONCURRENTLY não pode rodar dentro de transação)
-- Rollback: supabase/rollbacks/20261108223000_rollback.sql
-- Adiciona índice btree em summary_date para evitar seq scan no DELETE de datas
-- futuras dentro de fn_aggregate_stock_daily. Sem este índice a limpeza
-- (sempre 0 linhas removidas) executava varredura full em ~2.9M rows / 574 MB,
-- causando statement_timeout nos crons stock_daily_aggregation (22:30 BRT)
-- e stock-daily-backfill-today (03:15 BRT).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sds_summary_date
  ON public.stock_daily_summary (summary_date);
