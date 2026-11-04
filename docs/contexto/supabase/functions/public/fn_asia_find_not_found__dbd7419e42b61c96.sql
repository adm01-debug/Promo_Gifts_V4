CREATE OR REPLACE FUNCTION public.fn_asia_find_not_found(p_skus jsonb)
 RETURNS TABLE(api_sku text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_item jsonb; v_sku text; v_found boolean;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_skus) LOOP
    v_sku := trim(v_item->>'sku');
    IF v_sku IS NULL OR v_sku = '' THEN CONTINUE; END IF;
    SELECT EXISTS(
      SELECT 1 FROM product_variants pv
      JOIN products p ON p.id=pv.product_id
      WHERE p.supplier_id='d2734e23-d633-4819-bb15-e51aa44e2118'
        AND (pv.supplier_sku = v_sku OR pv.sku = 'ASIA-' || v_sku)
      LIMIT 1
    ) INTO v_found;
    IF NOT v_found THEN
      api_sku := v_sku;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$function$
