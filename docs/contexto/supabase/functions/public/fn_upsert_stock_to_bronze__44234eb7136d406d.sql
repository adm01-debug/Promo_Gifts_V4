CREATE OR REPLACE FUNCTION public.fn_upsert_stock_to_bronze(p_supplier_id uuid, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item       jsonb;
  v_sku        text;
  v_updated    int := 0;
  v_not_found  int := 0;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_sku := v_item->>'Sku';
    IF v_sku IS NULL OR v_sku = '' THEN CONTINUE; END IF;

    UPDATE public.supplier_products_raw
    SET
      stock_data = v_item,
      updated_at = now()
    WHERE supplier_id  = p_supplier_id
      AND supplier_sku = v_sku;

    IF FOUND THEN
      v_updated := v_updated + 1;
    ELSE
      v_not_found := v_not_found + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'updated',    v_updated,
    'not_found',  v_not_found,
    'total',      jsonb_array_length(p_items)
  );
END;
$function$
