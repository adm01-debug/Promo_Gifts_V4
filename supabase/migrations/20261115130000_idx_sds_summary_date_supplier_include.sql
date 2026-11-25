-- transaction: none
-- approved-by: @adm01-debug
-- (CREATE INDEX CONCURRENTLY não pode rodar dentro de transação — psql -1. O opt-out exige também
--  uma linha própria "-- approved-by: <dono>": é a aprovação humana e entra só no momento da
--  aplicação, nunca antes. Sem ela o preflight bloqueia, como deve.)
-- Rollback: supabase/rollbacks/20261115130000_rollback.sql
-- Índice de cobertura para a RPC fn_market_intelligence_macro (20261115130100): agregação de
-- stock_daily_summary por (summary_date, supplier_id) dentro de uma janela de até 366 dias, com
-- filtro opcional por fornecedor. EXPLAIN em produção (2026-11-15) da consulta equivalente =
-- Parallel Seq Scan em stock_daily_summary (~3,1M linhas, ~1 GB): nenhum índice existente tem
-- summary_date na frente sem predicado parcial (idx_daily_product_date é (product_id, summary_date);
-- idx_sds_cenario_a e idx_sds_zero_to_positive são parciais; idx_stock_daily_summary_supplier_id só
-- supplier_id). Com (summary_date, supplier_id) INCLUDE (stock_close, units_depleted, units_restocked)
-- a janela vira Index Only Scan por intervalo de data, sem tocar o heap.
-- Torna redundante o idx_sds_summary_date (20261108223000, pendente): prefixo (summary_date) deste.
-- Aplicar pela porta 5432 (E078), fora do pico e longe de 22:30 e 03:15 UTC (crons de agregação).
-- O db-apply-migration usa lock_timeout=1s: o CONCURRENTLY espera transações antigas, então esta
-- sessão usa lock_timeout generoso. Se uma tentativa anterior deixou o índice INVÁLIDO, o
-- IF NOT EXISTS o esconderia — por isso a guarda final falha alto; nesse caso rode o rollback
-- (DROP INDEX CONCURRENTLY) e reaplique.
SET lock_timeout = '5min';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sds_summary_date_supplier
  ON public.stock_daily_summary (summary_date, supplier_id)
  INCLUDE (stock_close, units_depleted, units_restocked);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_index WHERE indexrelid = to_regclass('public.idx_sds_summary_date_supplier') AND indisvalid) THEN
    RAISE EXCEPTION 'idx_sds_summary_date_supplier ausente ou INVÁLIDO após CREATE INDEX CONCURRENTLY — rode o rollback (DROP INDEX CONCURRENTLY) e reaplique';
  END IF;
END $$;
