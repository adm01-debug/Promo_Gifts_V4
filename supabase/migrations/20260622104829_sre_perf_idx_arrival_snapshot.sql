
-- MELHORIA 1: Índice parcial em arrival_snapshot_id
-- Sem este índice: Seq Scan em ~1.6k rows x ~113 calls/min = 180k row-reads/min desnecessários
-- Com índice: Index Scan O(log n) — custo quase zero
CREATE INDEX IF NOT EXISTS idx_sre_arrival_snapshot
  ON public.supplier_replenishment_events (arrival_snapshot_id)
  WHERE arrival_snapshot_id IS NOT NULL;

-- Verificar plano AGORA
-- (EXPLAIN real via execute_sql separado)
;
