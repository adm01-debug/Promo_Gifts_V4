CREATE OR REPLACE FUNCTION public.fn_sync_stock_bronze_to_gold_spot()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated int;
BEGIN
  WITH source AS (
    SELECT 
      spr.supplier_sku as sku,
      (spr.stock_data->>'Quantity')::int as qty
    FROM supplier_products_raw spr
    JOIN suppliers s ON s.id=spr.supplier_id
    WHERE s.code='STRICKER'
      AND spr.stock_data IS NOT NULL
      AND spr.stock_data->>'Quantity' IS NOT NULL
  )
  UPDATE product_variants pv
  SET 
    stock_quantity = src.qty,
    updated_at = now()
  FROM source src
  WHERE pv.sku = src.sku
    AND (pv.stock_quantity IS DISTINCT FROM src.qty);
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN jsonb_build_object('synced_variants', v_updated, 'synced_at', now());
END;
$function$
