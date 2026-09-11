
-- ================================================================
-- MIGRATION: fix_so_marcas_stale_bronze_rows_skipped_20260623
-- PROBLEMA: 496 rows de supplier_products_raw do Só Marcas em
--   status='pending' há 7-30+ dias, todos com product_id IS NOT NULL
--   (produtos já promovidos ao catálogo Gold).
--   Pipeline de Bronze do Só Marcas não está processando esses rows,
--   gerando alerta WARNING IMPORT_STALLED continuamente.
-- CAUSA: Mesmo padrão histórico de 397 rows marcados skipped
--   anteriormente. Rows Bronze ficam pending quando o pipeline
--   já processou o produto por outro canal.
-- AÇÃO: Marcar como 'skipped' APENAS rows com product_id IS NOT NULL
--   (100% dos 496) — garantia de que o produto já está no Gold.
-- SEGURANÇA:
--   - DRY-RUN confirmado: rows_atualizados=496, pending_restantes=0
--   - produto_integridade=0 (zero skipped sem product_id)
--   - alerta_IMPORT_STALLED_sumiu=true
-- ================================================================

UPDATE public.supplier_products_raw
SET status     = 'skipped'::supplier_raw_status,
    updated_at = NOW()
WHERE supplier_id = '841cd690-210a-422a-908c-7676828db272'  -- Só Marcas
  AND status = 'pending'::supplier_raw_status
  AND created_at < NOW()-INTERVAL '1 hour'
  AND product_id IS NOT NULL;  -- SOMENTE com produto já no catálogo
;
