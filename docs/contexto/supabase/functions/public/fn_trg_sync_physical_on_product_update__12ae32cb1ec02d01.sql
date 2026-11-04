CREATE OR REPLACE FUNCTION public.fn_trg_sync_physical_on_product_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (
    NEW.weight_g       IS DISTINCT FROM OLD.weight_g       OR
    NEW.height_cm      IS DISTINCT FROM OLD.height_cm      OR
    NEW.width_cm       IS DISTINCT FROM OLD.width_cm       OR
    NEW.length_cm      IS DISTINCT FROM OLD.length_cm      OR
    NEW.diameter_cm    IS DISTINCT FROM OLD.diameter_cm    OR
    NEW.capacity_ml    IS DISTINCT FROM OLD.capacity_ml    OR
    NEW.shape_type     IS DISTINCT FROM OLD.shape_type     OR
    NEW.box_length_cm  IS DISTINCT FROM OLD.box_length_cm  OR
    NEW.box_width_cm   IS DISTINCT FROM OLD.box_width_cm   OR
    NEW.box_height_cm  IS DISTINCT FROM OLD.box_height_cm  OR
    NEW.box_quantity   IS DISTINCT FROM OLD.box_quantity   OR
    NEW.box_weight_kg  IS DISTINCT FROM OLD.box_weight_kg  OR
    NEW.box_volume_cm3 IS DISTINCT FROM OLD.box_volume_cm3 OR
    NEW.box_length_mm  IS DISTINCT FROM OLD.box_length_mm  OR
    NEW.box_width_mm   IS DISTINCT FROM OLD.box_width_mm   OR
    NEW.box_height_mm  IS DISTINCT FROM OLD.box_height_mm
  ) THEN
    PERFORM public.fn_sync_product_physical_from_products(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$
