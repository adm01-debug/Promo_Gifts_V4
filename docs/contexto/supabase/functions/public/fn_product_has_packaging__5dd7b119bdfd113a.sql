CREATE OR REPLACE FUNCTION public.fn_product_has_packaging(p_product_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'has_included', EXISTS (
            SELECT 1 FROM product_packagings 
            WHERE product_id = p_product_id 
              AND relationship_type = 'included' 
              AND active = TRUE
        ),
        'has_optional', EXISTS (
            SELECT 1 FROM product_packagings 
            WHERE product_id = p_product_id 
              AND relationship_type = 'optional' 
              AND active = TRUE
        ),
        'has_required', EXISTS (
            SELECT 1 FROM product_packagings 
            WHERE product_id = p_product_id 
              AND relationship_type = 'required' 
              AND active = TRUE
        ),
        'packaging_count', (
            SELECT COUNT(*) FROM product_packagings 
            WHERE product_id = p_product_id AND active = TRUE
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$function$
