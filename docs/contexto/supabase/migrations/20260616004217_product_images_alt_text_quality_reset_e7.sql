-- ============================================================================
-- E7: Resetar alt_text curto (<20 chars) → trigger trg_product_images_seo_autofill
-- regenera via generate_image_alt_text() (≥35 chars, confirmado seguro).
-- Também cobre alt_text IS NULL que não foram preenchidos no INSERT original.
-- ============================================================================

-- Backup em caption antes de resetar (preservar texto original para auditoria)
UPDATE public.product_images
SET
  caption  = COALESCE(caption, alt_text),  -- guarda texto original se caption vazio
  alt_text = NULL                           -- trigger BEFORE UPDATE regenera automaticamente
WHERE (alt_text IS NULL OR (length(trim(alt_text)) < 20))
  AND is_active = true;

-- Verificação pós-update
DO $$
DECLARE
  v_com_alt    int;
  v_sem_alt    int;
  v_curto      int;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE alt_text IS NOT NULL AND length(alt_text) >= 20),
    COUNT(*) FILTER (WHERE alt_text IS NULL),
    COUNT(*) FILTER (WHERE alt_text IS NOT NULL AND length(alt_text) < 20)
  INTO v_com_alt, v_sem_alt, v_curto
  FROM public.product_images
  WHERE is_active = true;
  RAISE NOTICE 'E7 resultado: alt OK=%, sem alt=%, alt curto=%', v_com_alt, v_sem_alt, v_curto;
END $$;
