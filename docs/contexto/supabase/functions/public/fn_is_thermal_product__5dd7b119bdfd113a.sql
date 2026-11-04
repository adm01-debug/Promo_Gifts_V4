CREATE OR REPLACE FUNCTION public.fn_is_thermal_product(p_product_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_is_thermal BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM product_properties pp
        JOIN property_definitions pd ON pp.property_code = pd.code
        WHERE pp.product_id = p_product_id
          AND pd.is_thermal_indicator = TRUE
    ) INTO v_is_thermal;
    
    RETURN COALESCE(v_is_thermal, FALSE);
END;
$function$
