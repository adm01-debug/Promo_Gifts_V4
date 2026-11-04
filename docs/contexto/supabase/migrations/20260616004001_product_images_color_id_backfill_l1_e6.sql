-- ============================================================================
-- E6-L1: Preencher color_id via variant_id → product_variants.color_id
-- Afeta 1.781 imagens com applies_to_color=true, color_id IS NULL, variant_id SET.
-- ============================================================================
UPDATE public.product_images pi
SET color_id = pv.color_id
FROM public.product_variants pv
WHERE pv.id = pi.variant_id
  AND pi.color_id IS NULL
  AND pi.applies_to_color = true
  AND pi.is_active = true
  AND pv.color_id IS NOT NULL;

DO $$
DECLARE v_restante int;
BEGIN
  SELECT COUNT(*) INTO v_restante
  FROM public.product_images
  WHERE applies_to_color = true AND color_id IS NULL AND is_active = true;
  RAISE NOTICE 'E6-L1 concluído. Imagens ainda sem color_id (applies_to_color=true): %', v_restante;
END $$;
