-- transaction: none
-- Rollback: 20261115130000_idx_sds_summary_date_supplier_include.sql — remove o índice de cobertura.
-- Nenhum dado é alterado. Antes de reverter, confira que fn_market_intelligence_macro (20261115130100)
-- não está em uso: sem o índice ela volta a Seq Scan em ~3,1M linhas.
DROP INDEX CONCURRENTLY IF EXISTS public.idx_sds_summary_date_supplier;
