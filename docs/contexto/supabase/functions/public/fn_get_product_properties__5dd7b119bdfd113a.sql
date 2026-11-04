CREATE OR REPLACE FUNCTION public.fn_get_product_properties(p_product_id uuid)
 RETURNS TABLE(property_code text, property_name text, property_category text, property_value text, icon_code text, is_thermal boolean)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        pp.property_code,
        COALESCE(pd.name_pt, pp.raw_value) AS property_name,
        pd.category AS property_category,
        pp.property_value,
        pd.icon_code,
        pd.is_thermal_indicator AS is_thermal
    FROM product_properties pp
    LEFT JOIN property_definitions pd ON pp.property_code = pd.code
    WHERE pp.product_id = p_product_id
    ORDER BY pd.display_order, pd.name_pt;
END;
$function$
