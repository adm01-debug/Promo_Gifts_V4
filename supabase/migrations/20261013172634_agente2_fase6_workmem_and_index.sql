-- Rollback: See supabase/rollbacks/20261013172634_rollback.sql
-- Espelho do ledger (reconciliação B2, 2026-10-15)
-- version=20261013172634 name=agente2_fase6_workmem_and_index
-- Aplicada em doufsxqlfjyuvxuezpln em 2026-10-13 via MCP apply_migration (Agente 2, incidente 2026-10-13).
-- Corresponde às seções 7-8 do antigo 20261013141700_fase6_cron_pipelines.sql (renomeado para cá).
-- As seções 1-6 daquele arquivo (cron.alter_job) foram aplicadas fora de migration e estão
-- registradas, de forma idempotente, em 20261015120000_reconcilia_oob_incidente_2026_10_13.sql.
-- Corpo = statements do ledger, byte a byte: md5 = f7107c430d32ddbdb92967f6c26dbddd.
-- Versão comentada anterior:
--   git show 1b59d0f:supabase/migrations/20261013141700_fase6_cron_pipelines.sql
-- Já está no ledger: NÃO reaplicar.
-- >>> statements do ledger (byte-exato) abaixo desta linha <<<
-- SET LOCAL work_mem equivalente via ALTER FUNCTION ... SET work_mem,
-- escopado so a essas funcoes (nao altera o parametro global).
ALTER FUNCTION public.fn_aggregate_stock_daily(date) SET work_mem = '64MB';
ALTER FUNCTION public.fn_reposicao_backfill_today() SET work_mem = '64MB';
ALTER FUNCTION public.fn_reconcile_stock_gold(boolean) SET work_mem = '64MB';
ALTER FUNCTION public.refresh_all_materialized_views() SET work_mem = '64MB';

-- Indice de apoio adicional: permite index scan sargable na data BR usada
-- por fn_aggregate_stock_daily (hoje o filtro usa uma expressao sobre
-- captured_at, que forcava varrer e descartar ~133k linhas por execucao).
CREATE INDEX IF NOT EXISTS idx_stock_snapshots_captured_at_br_date
  ON public.stock_snapshots (( (captured_at AT TIME ZONE 'America/Sao_Paulo')::date ), variant_supplier_source_id)
  WHERE variant_supplier_source_id IS NOT NULL;
