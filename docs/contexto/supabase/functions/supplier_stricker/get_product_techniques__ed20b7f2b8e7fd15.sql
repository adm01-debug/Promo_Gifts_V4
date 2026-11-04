CREATE OR REPLACE FUNCTION supplier_stricker.get_product_techniques(p_prod_reference character varying)
 RETURNS TABLE(technique_code character varying, technique_name character varying, locations_count bigint, min_area_cm2 numeric, max_area_cm2 numeric)
 LANGUAGE plpgsql
 SET search_path TO 'supplier_stricker', 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        co.technique_code,
        co.technique_name,
        COUNT(DISTINCT co.location_code) as locations_count,
        MIN(co.area_width_cm * co.area_height_cm) as min_area_cm2,
        MAX(co.area_width_cm * co.area_height_cm) as max_area_cm2
    FROM supplier_stricker.customization_options co
    WHERE co.prod_reference = p_prod_reference
      AND co.is_active = true
    GROUP BY co.technique_code, co.technique_name;
END;
$function$
