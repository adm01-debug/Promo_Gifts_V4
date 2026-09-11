
-- ══════════════════════════════════════════════════════════════════
-- Melhoria 3: Criar índices FK faltantes em tabelas críticas
-- 
-- stock_daily_summary.supplier_id → joins por fornecedor sem índice
-- stock_snapshots.supplier_branch_id → nullable FK sem índice
-- product_images.organization_id → constante (1 org), sem índice
--   mas com 72k+ linhas: parcial WHERE IS NOT NULL, baixo impacto
-- ══════════════════════════════════════════════════════════════════

-- 3A: stock_daily_summary.supplier_id
CREATE INDEX IF NOT EXISTS idx_stock_daily_supplier_id
  ON public.stock_daily_summary(supplier_id);

COMMENT ON INDEX public.idx_stock_daily_supplier_id IS
'FK backing index para supplier_id em stock_daily_summary. Criado 2026-06-23.';

-- 3B: stock_snapshots.supplier_branch_id (parcial — nullable)
CREATE INDEX IF NOT EXISTS idx_stock_snapshots_branch_id
  ON public.stock_snapshots(supplier_branch_id)
  WHERE supplier_branch_id IS NOT NULL;

COMMENT ON INDEX public.idx_stock_snapshots_branch_id IS
'FK backing index para supplier_branch_id (nullable) em stock_snapshots. Criado 2026-06-23.';
;
