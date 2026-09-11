
-- ============================================================
-- FIX 5: image_type_id é nullable mas tem 0 NULLs.
-- O trigger fn_auto_classify_product_image SEMPRE preenche o campo.
-- Adicionar NOT NULL + DEFAULT para o tipo 'other' como safety net.
-- ============================================================

-- Garantir que o tipo 'other' existe (fallback seguro)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.image_types WHERE code = 'other'
  ) THEN
    INSERT INTO public.image_types (code, name, category, display_priority)
    VALUES ('other', 'Não Classificado', 'other', 99);
  END IF;
END $$;

-- Adicionar DEFAULT para o tipo 'other' (UUID fixo já existente)
ALTER TABLE public.product_images
  ALTER COLUMN image_type_id
  SET DEFAULT '953d054a-3bbc-4954-a319-b3c806ac596f'; -- UUID do tipo 'other'

-- Adicionar NOT NULL (safe: 0 NULLs atuais confirmados)
ALTER TABLE public.product_images
  ALTER COLUMN image_type_id SET NOT NULL;

COMMENT ON COLUMN public.product_images.image_type_id IS
  'FK para image_types — tipo padronizado da imagem (substituiu image_type legacy).
   NOT NULL desde 2026-06-15 (0 NULLs confirmados, sempre preenchido pelo trigger fn_auto_classify_product_image).
   DEFAULT = 953d054a (other) como safety net caso trigger seja bypassado.';
;
