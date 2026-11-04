CREATE OR REPLACE FUNCTION public.fn_get_supplier_mappings(p_supplier_code text)
 RETURNS TABLE(id uuid, raw_pattern text, property_code text, property_name text, category text, priority integer, is_thermal boolean)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        spm.id,
        spm.raw_pattern,
        spm.property_code,
        pd.name_pt AS property_name,
        pd.category,
        spm.priority,
        pd.is_thermal_indicator AS is_thermal
    FROM supplier_property_mappings spm
    LEFT JOIN property_definitions pd ON spm.property_code = pd.code
    WHERE spm.supplier_code = p_supplier_code
      AND spm.active = TRUE
    ORDER BY spm.priority DESC, pd.name_pt;
END;
$function$
