CREATE OR REPLACE FUNCTION public.generate_variant_sku_by_color_code(p_product_code text, p_supplier_id uuid, p_color_code text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_supplier_color_id UUID;
BEGIN
    SELECT id INTO v_supplier_color_id
    FROM supplier_colors
    WHERE supplier_id = p_supplier_id
      AND code = p_color_code
    LIMIT 1;
    
    IF v_supplier_color_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN generate_variant_sku(p_product_code, v_supplier_color_id);
END;
$function$
