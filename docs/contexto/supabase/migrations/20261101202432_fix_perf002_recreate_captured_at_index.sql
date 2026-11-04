-- Fix PERF: recria idx_snapshots_captured_at dropado em PERF-002
-- fn_purge_old_stock_snapshots usa ORDER BY captured_at LIMIT -- sem índice faz seqscan 3.6M linhas
-- ROLLBACK: DROP INDEX IF EXISTS public.idx_snapshots_captured_at;
CREATE INDEX IF NOT EXISTS idx_snapshots_captured_at
  ON public.stock_snapshots(captured_at);
