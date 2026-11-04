-- ============================================================================
-- E3-ASIA: Bulk backfill 768×768 para todas as imagens ASIA sem dimensões.
-- Invariante verificado: 60 existentes são ALL 768×768, 0 exceções.
-- ============================================================================
UPDATE public.product_images
SET
  width_px  = 768,
  height_px = 768
WHERE source_supplier = 'ASIA'
  AND (width_px IS NULL OR height_px IS NULL);

DO $$
DECLARE v_sem int;
BEGIN
  SELECT COUNT(*) INTO v_sem
  FROM public.product_images
  WHERE source_supplier = 'ASIA' AND (width_px IS NULL OR height_px IS NULL);
  RAISE NOTICE 'E3-ASIA concluído. ASIA ainda sem dimensões: %', v_sem;
END $$;
