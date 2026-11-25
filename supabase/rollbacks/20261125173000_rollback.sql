-- Rollback de 20261125173000_idx_sds_summary_date_supplier_aplicavel.sql
-- Remove o indice de cobertura de stock_daily_summary. Nao toca em dados.
DROP INDEX CONCURRENTLY IF EXISTS public.idx_sds_summary_date_supplier;
