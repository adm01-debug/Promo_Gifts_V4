CREATE OR REPLACE FUNCTION public.trg_product_images_seo_autofill()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$
