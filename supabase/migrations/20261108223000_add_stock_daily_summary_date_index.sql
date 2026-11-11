-- transaction: none
-- (CREATE INDEX CONCURRENTLY não pode rodar dentro de transação; o opt-out exige também a
--  linha "-- approved-by: <nome>", que é a aprovação humana do dono — adicionar ao aplicar.)
-- Rollback: supabase/rollbacks/20261108223000_rollback.sql
-- Adiciona índice btree em summary_date para evitar seq scan no DELETE de datas
-- futuras dentro de fn_aggregate_stock_daily. Sem este índice a limpeza
-- (sempre 0 linhas removidas) executava varredura full em ~2.9M rows / 594 MB,
-- causando statement_timeout nos crons stock_daily_aggregation (22:30) e
-- stock-daily-backfill-today (03:15) — estouraram em 04–08/11.
-- Aplicar pela porta 5432 (E078), longe de 22:30 e 03:15.
--
-- O db-apply-migration usa lock_timeout=1s: o CONCURRENTLY espera transações antigas e
-- falharia deixando um índice INVÁLIDO que o IF NOT EXISTS depois esconderia. Por isso:
-- (1) lock_timeout generoso só nesta sessão; (2) se houver índice inválido de tentativa
-- anterior, ele é removido antes; (3) no fim, falha se o índice não estiver válido.
SET lock_timeout = '5min';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_index WHERE indexrelid = to_regclass('public.idx_sds_summary_date') AND NOT indisvalid) THEN
    RAISE NOTICE 'idx_sds_summary_date inválido de tentativa anterior: removendo';
  END IF;
END $$;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_sds_summary_date_invalid_guard;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sds_summary_date
  ON public.stock_daily_summary (summary_date);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_index WHERE indexrelid = to_regclass('public.idx_sds_summary_date') AND indisvalid) THEN
    RAISE EXCEPTION 'idx_sds_summary_date ausente ou INVÁLIDO após CREATE INDEX CONCURRENTLY — rode o rollback (DROP INDEX CONCURRENTLY) e reaplique';
  END IF;
END $$;
