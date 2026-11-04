CREATE OR REPLACE FUNCTION public.fn_sync_product_stock_cache()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_product_id uuid; v_stock integer;
BEGIN
  -- Determinar qual produto foi afetado (via variant)
  IF TG_TABLE_NAME = 'variant_supplier_sources' THEN
    SELECT product_id INTO v_product_id FROM product_variants 
    WHERE id = COALESCE(NEW.variant_id, OLD.variant_id);
  ELSIF TG_TABLE_NAME = 'product_variants' THEN
    v_product_id := COALESCE(NEW.product_id, OLD.product_id);
  END IF;
  
  IF v_product_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  SELECT COALESCE(SUM(v.quantity), 0)::integer INTO v_stock
  FROM product_variants pv
  LEFT JOIN variant_supplier_sources v ON v.variant_id = pv.id AND v.is_active
  WHERE pv.product_id = v_product_id AND pv.is_active;
  
  UPDATE products
  SET stock_quantity = v_stock,
      last_stock_update_at = now(),
      is_stockout = (v_stock <= 0)
  WHERE id = v_product_id
    AND (stock_quantity IS DISTINCT FROM v_stock OR is_stockout IS DISTINCT FROM (v_stock <= 0));
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
