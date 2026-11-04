CREATE OR REPLACE FUNCTION public.fn_trigger_rebuild_swatches_on_variant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_product_id  uuid;
  v_new_swatches jsonb;
BEGIN
  -- Guard 1: não rodar durante bulk import
  IF current_setting('app.bulk_import_mode', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_product_id := COALESCE(NEW.product_id, OLD.product_id);

  -- Guard 2: calcular novo valor apenas se necessário
  v_new_swatches := fn_rebuild_color_swatches(v_product_id);

  -- Guard 3: só update se o valor realmente mudou (evita cascata de triggers em products)
  UPDATE products
    SET color_swatches = v_new_swatches
  WHERE id = v_product_id
    AND (color_swatches IS DISTINCT FROM v_new_swatches);

  RETURN COALESCE(NEW, OLD);
END;
$function$
