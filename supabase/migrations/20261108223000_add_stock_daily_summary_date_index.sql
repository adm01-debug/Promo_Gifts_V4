-- transaction: none
-- (CREATE INDEX CONCURRENTLY não pode rodar dentro de transação. O opt-out exige também uma
--  linha própria de aprovação com o nome do dono — a aprovação humana; ela é adicionada no
--  momento da aplicação, nunca antes. Sem ela o preflight bloqueia, como deve.)
-- Rollback: supabase/rollbacks/20261108223000_rollback.sql
-- Adiciona índice btree em summary_date para evitar seq scan no DELETE de datas
-- futuras dentro de fn_aggregate_stock_daily. Sem este índice a limpeza
-- (sempre 0 linhas removidas) executava varredura full em ~2.9M rows / 594 MB,
-- causando statement_timeout nos crons stock_daily_aggregation (22:30) e
-- stock-daily-backfill-today (03:15) — estouraram em 04–08/11.
-- Aplicar pela porta 5432 (E078), longe de 22:30 e 03:15.
--
-- O db-apply-migration usa lock_timeout=1s: o CONCURRENTLY espera transações antigas, então
-- esta sessão usa lock_timeout generoso. Se uma tentativa anterior deixou o índice INVÁLIDO,
-- o IF NOT EXISTS o esconderia — por isso a guarda final falha alto; nesse caso rode o
-- rollback (DROP INDEX CONCURRENTLY) e reaplique. (Recuperação automática exigiria comandos
-- do psql — \gset/\if — que quebram o replay das migrations fora do psql.)
SET lock_timeout = '5min';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sds_summary_date
  ON public.stock_daily_summary (summary_date);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_index WHERE indexrelid = to_regclass('public.idx_sds_summary_date') AND indisvalid) THEN
    RAISE EXCEPTION 'idx_sds_summary_date ausente ou INVÁLIDO após CREATE INDEX CONCURRENTLY — rode o rollback (DROP INDEX CONCURRENTLY) e reaplique';
  END IF;
END $$;
