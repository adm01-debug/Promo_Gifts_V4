CREATE OR REPLACE FUNCTION public.fn_trigger_rebuild_swatches_on_image()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_product_id   uuid;
  v_new_swatches jsonb;
BEGIN
  -- Guard 1: não rodar durante bulk import
  IF current_setting('app.bulk_import_mode', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_product_id := COALESCE(NEW.product_id, OLD.product_id);

  -- Guard 2: só interessa se a imagem tem vínculo de variante ou cor
  -- (imagens genéricas do produto não afetam os swatches)
  IF COALESCE(NEW.variant_id, OLD.variant_id) IS NULL AND
     COALESCE(NEW.color_id,   OLD.color_id)   IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Guard 3: só types relevantes para swatches
  IF COALESCE(NEW.image_type, OLD.image_type) NOT IN ('main','gallery','product') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Recalcular e atualizar apenas se mudou
  v_new_swatches := fn_rebuild_color_swatches(v_product_id);

  UPDATE products
    SET color_swatches = v_new_swatches
  WHERE id = v_product_id
    AND (color_swatches IS DISTINCT FROM v_new_swatches);

  RETURN COALESCE(NEW, OLD);
END;
$function$
