-- Fix PERF: recria idx_snapshots_captured_at dropado em PERF-002
-- Severidade: ALTO | Tipo: PERFORMANCE/INTEGRIDADE
-- Bug: migration 20261101194200 dropou idx_snapshots_captured_at (idx_scan=0 em 30d).
-- Porém fn_purge_old_stock_snapshots usa ORDER BY captured_at LIMIT — sem este índice,
-- o cron de purge (habilitado pelo fix CRON-001) faz seqscan em 3.6M linhas a cada run.
-- Evidência: SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='fn_purge_old_stock_snapshots';
--            → ORDER BY captured_at LIMIT ...
-- ROLLBACK: DROP INDEX IF EXISTS public.idx_snapshots_captured_at;
-- CLASSE: APROVAÇÃO — aplicar via db-apply-migration.yml workflow.

CREATE INDEX IF NOT EXISTS idx_snapshots_captured_at
  ON public.stock_snapshots(captured_at);
