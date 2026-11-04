CREATE OR REPLACE FUNCTION public.fn_products_capture_manual_edits()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_src text := current_setting('app.write_source', true);
  v_campos text[] := ARRAY[
    'name','description','short_description','sku','cost_price','sale_price','suggested_price',
    'primary_image_url','images','ncm_code','weight_g','height_cm','width_cm','length_cm',
    'dimensions_display','box_length_cm','box_width_cm','box_height_cm','box_weight_kg','box_volume_cm3',
    'box_quantity','box_inner_quantity','brand','packing_type','repacking_type','capacities','capacity_ml',
    'min_quantity','stock_quantity','is_active','warranty_months','ipi_rate','engraving_type','colors',
    'category_id','main_category_id'
  ];
  v_campo text;
  v_old jsonb := to_jsonb(OLD);
  v_new jsonb := to_jsonb(NEW);
BEGIN
  IF TG_OP = 'UPDATE' AND COALESCE(v_src,'ui') <> 'pipeline' THEN
    FOREACH v_campo IN ARRAY v_campos LOOP
      IF (v_old -> v_campo) IS DISTINCT FROM (v_new -> v_campo) THEN
        IF NOT (v_campo = ANY(NEW.locked_fields)) THEN
          NEW.locked_fields := array_append(NEW.locked_fields, v_campo);
        END IF;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$
