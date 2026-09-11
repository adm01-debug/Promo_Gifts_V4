
-- ================================================================
-- MIGRATION: fix_xbz_quarantined_e09284_reset_pending_20260623
-- PROBLEMA: 8 variantes do produto E@09284 (XBZ) estavam em
--   status='quarantined' após 5 tentativas falhadas com erro:
--   "column "active" of relation "products" does not exist"
--   no stage='promote' às 09:02 UTC.
-- CAUSA RAIZ: Versão anterior de fn_site_promote_to_gold (ou código
--   externo) ainda referenciava products.active que foi dropada.
--   A coluna products.active foi eliminada definitivamente e NENHUMA
--   função pública mais a referencia (auditoria confirmada).
-- AÇÃO: Reset para status='pending' + attempts=0 para que o pipeline
--   tente novamente com a função corrigida.
-- SEGURANÇA:
--   - DRY-RUN confirmado: 8 rows resetados, 0 quarantined restantes
--   - produto_id IS NULL (produto não existe no catálogo ainda)
--   - Se falhar de novo → voltam para quarantined (sem dano)
-- ================================================================

UPDATE public.supplier_products_raw
SET status     = 'pending'::supplier_raw_status,
    attempts   = 0,
    last_error = jsonb_build_object(
      'reset_reason', 'quarantined_by_products_active_column_now_dropped',
      'original_error', last_error,
      'reset_at',      NOW()::text,
      'migration',     'fix_xbz_quarantined_e09284_reset_pending_20260623'
    ),
    updated_at = NOW()
WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900'
  AND status    = 'quarantined'::supplier_raw_status
  AND last_error->>'erro' ILIKE '%column "active" of relation "products" does not exist%'
  AND product_id IS NULL;
;
