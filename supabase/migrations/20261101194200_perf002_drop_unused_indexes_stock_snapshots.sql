-- PERF-002: Drop 7 índices não usados em public.stock_snapshots
-- Severidade: CRÍTICO | Tipo: PERFORMANCE
-- Evidência: pg_stat_user_indexes (idx_scan=0 após VACUUM ANALYZE 2026-11-01 19:37 UTC)
-- Impacto: ~641MB de índices consumindo I/O sem retorno em queries; overhead em cada INSERT/DELETE.
-- Stats verificadas APÓS vacuum-snapshots-now cron job (status=succeeded, 2x confirmado).
-- ROLLBACK: Recriar cada índice conforme definição original (ver RELATORIO_AUDITORIA_SUPABASE.md PERF-002).

DROP INDEX IF EXISTS public.idx_ss_supplier_id;
DROP INDEX IF EXISTS public.idx_stock_snapshots_captured_at_br_date;
DROP INDEX IF EXISTS public.idx_stock_snapshots_supplier_branch_id;
DROP INDEX IF EXISTS public.idx_snapshots_vss_captured;
DROP INDEX IF EXISTS public.idx_snapshots_product_captured;
DROP INDEX IF EXISTS public.idx_snapshots_captured_at;
DROP INDEX IF EXISTS public.idx_ss_variant_id;
