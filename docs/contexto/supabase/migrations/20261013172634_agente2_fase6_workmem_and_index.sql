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
