CREATE OR REPLACE FUNCTION public.fn_sync_product_has_sizes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_product_id uuid;
  v_has_sizes boolean;
BEGIN
  v_product_id := COALESCE(NEW.product_id, OLD.product_id);
  
  SELECT EXISTS (
    SELECT 1 FROM product_variants
    WHERE product_id = v_product_id
      AND is_active
      AND size_code IS NOT NULL
  ) INTO v_has_sizes;
  
  UPDATE products 
  SET has_sizes = v_has_sizes
  WHERE id = v_product_id
    AND COALESCE(has_sizes, false) <> v_has_sizes;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
