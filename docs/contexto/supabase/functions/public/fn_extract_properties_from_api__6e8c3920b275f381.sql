CREATE OR REPLACE FUNCTION public.fn_extract_properties_from_api(p_raw_properties text, p_supplier_code text DEFAULT 'spot'::text)
 RETURNS TABLE(property_code text, property_value text, raw_value text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF p_raw_properties IS NULL OR TRIM(p_raw_properties) = '' THEN
        RETURN;
    END IF;

    -- Usar a função multi-fornecedor
    RETURN QUERY
    SELECT 
        e.property_code,
        e.property_value,
        e.raw_value
    FROM fn_extract_properties_by_supplier(p_raw_properties, p_supplier_code) e;
END;
$function$
