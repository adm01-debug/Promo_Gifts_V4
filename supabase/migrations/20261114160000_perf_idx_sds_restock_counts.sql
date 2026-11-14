-- transaction: none
-- (CREATE INDEX CONCURRENTLY não pode rodar dentro de transação — psql -1. O opt-out exige também
--  uma linha própria "-- approved-by: <dono>": é a aprovação humana e entra só no momento da
--  aplicação, nunca antes. Sem ela o preflight bloqueia, como deve.)
-- Rollback: supabase/rollbacks/20261114160000_rollback.sql
-- Índice parcial para o bloco 'restocks' de fn_get_stock_notification_counts (sino de estoque no
-- Header, StockAlertsIndicator.tsx; ~25,7k chamadas/24h, média 522 ms). Hoje o planner usa
-- idx_sds_cenario_a (summary_date, stock_open, stock_close) WHERE restock_detected = true: lê ~9,3k
-- linhas/9,3k buffers dos últimos 30 dias e descarta 7,8k pelo filtro COALESCE(stock_close,0) > 0
-- AND COALESCE(stock_open,0) = 0, depois busca products_pkey para ~1,5k linhas (EXPLAIN ANALYZE
-- em produção, 2026-11-14). Este índice guarda só as linhas que casam com o WHERE da função
-- (predicado idêntico ao de pg_get_functiondef, então implicado) e cobre product_id (index-only).
-- Aplicar pela porta 5432 (E078), com o banco fora do pico; o CONCURRENTLY não bloqueia escrita em
-- stock_daily_summary (o build lê ~610 MB de heap).
-- O db-apply-migration usa lock_timeout=1s: o CONCURRENTLY espera transações antigas, então esta
-- sessão usa lock_timeout generoso. Se uma tentativa anterior deixou o índice INVÁLIDO, o
-- IF NOT EXISTS o esconderia — por isso a guarda final falha alto; nesse caso rode o rollback
-- (DROP INDEX CONCURRENTLY) e reaplique.
SET lock_timeout = '5min';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sds_restock_zero_to_pos_date
  ON public.stock_daily_summary (summary_date) INCLUDE (product_id)
  WHERE restock_detected = true AND COALESCE(stock_open, 0) = 0 AND COALESCE(stock_close, 0) > 0;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_index WHERE indexrelid = to_regclass('public.idx_sds_restock_zero_to_pos_date') AND indisvalid) THEN
    RAISE EXCEPTION 'idx_sds_restock_zero_to_pos_date ausente ou INVÁLIDO após CREATE INDEX CONCURRENTLY — rode o rollback (DROP INDEX CONCURRENTLY) e reaplique';
  END IF;
END $$;
