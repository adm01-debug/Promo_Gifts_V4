-- ============================================================================
-- E2-L2a: Todos os spot-pa-* são PNG (confirmado via CF API em amostra de 8)
-- location=7755, component=3025, area=1167 → total 11.947 imagens
-- ============================================================================
UPDATE public.product_images
SET format = 'png'
WHERE format IS NULL
  AND source_supplier = 'SPOT'
  AND cloudflare_image_id LIKE 'spot-pa-%';

-- ============================================================================
-- E2-L2b: XBZ xbz-p-05054 — ausente no Cloudflare (missing na batch_check)
-- → marcar como inativa para não servir URL quebrada ao site
-- ============================================================================
UPDATE public.product_images
SET is_active = false
WHERE cloudflare_image_id = 'xbz-p-05054'
  AND format IS NULL;

-- Verificação inline
DO $$
DECLARE v_sem_format int;
BEGIN
  SELECT COUNT(*) INTO v_sem_format FROM public.product_images WHERE format IS NULL;
  RAISE NOTICE 'E2 concluído. Imagens ainda sem format: %', v_sem_format;
END $$;
