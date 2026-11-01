-- PERF-001: Índices parciais para acelerar fn_pipeline_health (32s média)
-- Severidade: MÉDIO | Tipo: PERFORMANCE
-- Causa: fn_pipeline_health executa ~20 COUNT(*) em supplier_products_raw por valores
--        exatos de status (='pending', ='failed', ='quarantined'). Índices existentes
--        (idx_spr_unprocessed, idx_spr_images_pending, idx_spr_stock_pending) usam
--        filtros !=, não cobrem buscas por valor exato eficientemente.
-- Risco de regressão: baixo — apenas adição de índices, sem alteração de dados.

-- Status pipeline: 'pending' e 'failed'/'quarantined'
CREATE INDEX IF NOT EXISTS idx_spr_status_pending
  ON public.supplier_products_raw (supplier_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_spr_status_failed_quarantined
  ON public.supplier_products_raw (supplier_id)
  WHERE status IN ('failed', 'quarantined');

-- images_status = 'pending'
CREATE INDEX IF NOT EXISTS idx_spr_images_status_pending
  ON public.supplier_products_raw (id)
  WHERE images_status = 'pending';

-- stock_status = 'pending'
CREATE INDEX IF NOT EXISTS idx_spr_stock_status_pending
  ON public.supplier_products_raw (id)
  WHERE stock_status = 'pending';

-- site_status
CREATE INDEX IF NOT EXISTS idx_spr_site_status_failed
  ON public.supplier_products_raw (id)
  WHERE site_status = 'failed';

CREATE INDEX IF NOT EXISTS idx_spr_site_status_pending
  ON public.supplier_products_raw (id)
  WHERE site_status = 'pending';

-- Verificação pós-apply:
--   SELECT indexname FROM pg_indexes
--   WHERE tablename = 'supplier_products_raw'
--   AND indexname LIKE 'idx_spr_status_%'
--   ORDER BY indexname;
--   → deve retornar idx_spr_status_failed_quarantined, idx_spr_status_pending

-- ROLLBACK:
--   DROP INDEX IF EXISTS public.idx_spr_status_pending;
--   DROP INDEX IF EXISTS public.idx_spr_status_failed_quarantined;
--   DROP INDEX IF EXISTS public.idx_spr_images_status_pending;
--   DROP INDEX IF EXISTS public.idx_spr_stock_status_pending;
--   DROP INDEX IF EXISTS public.idx_spr_site_status_failed;
--   DROP INDEX IF EXISTS public.idx_spr_site_status_pending;
