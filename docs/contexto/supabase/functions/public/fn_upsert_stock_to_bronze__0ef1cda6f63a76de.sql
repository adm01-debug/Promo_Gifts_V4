CREATE OR REPLACE FUNCTION public.fn_upsert_stock_to_bronze(p_sku text, p_quantity integer, p_next_date1 text DEFAULT ''::text, p_next_qty1 integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_supplier_id uuid;
  v_updated int;
BEGIN
  SELECT id INTO v_supplier_id FROM suppliers WHERE code='STRICKER' LIMIT 1;
  
  UPDATE supplier_products_raw
  SET 
    stock_data = jsonb_build_object(
      'Sku', p_sku,
      'Quantity', p_quantity,
      'NextQuantity1', p_next_qty1,
      'NextDate1', COALESCE(p_next_date1, ''),
      '_updated_at', now()::text
    ),
    updated_at = now()
  WHERE supplier_id = v_supplier_id
    AND supplier_sku = p_sku;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN jsonb_build_object('sku', p_sku, 'updated', v_updated, 'quantity', p_quantity);
END;
$function$
