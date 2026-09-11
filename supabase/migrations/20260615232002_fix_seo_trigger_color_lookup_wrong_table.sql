
-- ============================================================
-- FIX 1: Bug crítico — SEO trigger buscava cor em variation_values
-- mas product_images.color_id → color_variations(id)
-- ============================================================

-- STEP 1: Corrigir a função do trigger
CREATE OR REPLACE FUNCTION trg_product_images_seo_autofill()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_product_name TEXT;
  v_color_name   TEXT;
BEGIN
  SELECT name INTO v_product_name
  FROM products WHERE id = NEW.product_id;

  -- CORRIGIDO: era variation_values (tabela errada).
  -- color_id → color_variations(id), campo correto é 'name'.
  IF NEW.color_id IS NOT NULL THEN
    SELECT name INTO v_color_name
    FROM color_variations WHERE id = NEW.color_id;
  END IF;

  IF (NEW.alt_text IS NULL OR LENGTH(TRIM(COALESCE(NEW.alt_text, ''))) = 0)
     AND v_product_name IS NOT NULL
  THEN
    NEW.alt_text := generate_image_alt_text(
      v_product_name, NEW.image_type, v_color_name, COALESCE(NEW.display_order, 1)
    );
  END IF;

  IF (NEW.title_text IS NULL OR LENGTH(TRIM(COALESCE(NEW.title_text, ''))) = 0)
     AND v_product_name IS NOT NULL
  THEN
    NEW.title_text := v_product_name;
    IF v_color_name IS NOT NULL THEN
      NEW.title_text := NEW.title_text || ' - ' || v_color_name;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trg_product_images_seo_autofill() IS
  'FIXED 2026-06-15: color lookup era variation_values (errado) → color_variations (correto).';

-- STEP 2: Backfill — regenerar title_text e alt_text para imagens com color_id
-- onde o nome da cor NÃO está presente no title_text atual.
-- Sintaxe correta: FROM-clause separada do target
UPDATE public.product_images
SET
  title_text = p.name || ' - ' || cv.name,
  alt_text   = generate_image_alt_text(
                 p.name,
                 product_images.image_type,
                 cv.name,
                 COALESCE(product_images.display_order, 1)
               ),
  updated_at = NOW()
FROM public.products p,
     public.color_variations cv
WHERE product_images.product_id = p.id
  AND product_images.color_id = cv.id
  AND cv.name IS NOT NULL
  AND (
    product_images.title_text NOT ILIKE ('%' || cv.name || '%')
    OR product_images.title_text = p.name
  );
;
