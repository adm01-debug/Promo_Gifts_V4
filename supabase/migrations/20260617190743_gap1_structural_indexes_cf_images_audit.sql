
-- ============================================================================
-- STEP 5: Indexes estratégicos em _cf_images_audit
-- Finalidade: suportar queries de monitoramento, sync e reconciliação
-- Impacto de insert: mínimo (~3 índices adicionais em tabela de 72k rows)
-- ============================================================================

-- 1. Index temporal em uploaded (queries de janelas de tempo CF)
--    Uso: "quais imagens foram uploadadas no último mês?"
--    Uso: "imagens mais recentes no CF"
CREATE INDEX IF NOT EXISTS idx_cfa_uploaded
  ON public._cf_images_audit (uploaded)
  WHERE uploaded IS NOT NULL;

-- 2. Index em ingested_at (monitoramento de sincronização)
--    Uso: "quando foi o último batch de ingest?"
--    Uso: "imagens ingeridas nas últimas 24h"
CREATE INDEX IF NOT EXISTS idx_cfa_ingested_at
  ON public._cf_images_audit (ingested_at DESC);

-- 3. Expression index em meta->>'supplier' (queries por fornecedor)
--    Uso: SELECT * FROM _cf_images_audit WHERE meta->>'supplier' = 'XBZ'
--    Custo de insert: mínimo — 28k rows têm meta com supplier, índice parcial
CREATE INDEX IF NOT EXISTS idx_cfa_meta_supplier
  ON public._cf_images_audit ((meta->>'supplier'))
  WHERE meta IS NOT NULL;

-- 4. Expression index em meta->>'source' (queries de proveniência)
--    Uso: auditar qual processo inseriu o dado
CREATE INDEX IF NOT EXISTS idx_cfa_meta_source
  ON public._cf_images_audit ((meta->>'source'))
  WHERE meta IS NOT NULL;

-- 5. Index em require_signed (filtro rápido — embora hoje = 100% false)
--    Útil para alertas futuros se require_signed=true aparecer
CREATE INDEX IF NOT EXISTS idx_cfa_require_signed
  ON public._cf_images_audit (require_signed)
  WHERE require_signed = true;
;
