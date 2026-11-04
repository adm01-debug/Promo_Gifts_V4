CREATE OR REPLACE FUNCTION public.fn_map_value(p_supplier_id uuid, p_field_type character varying, p_source_value character varying)
 RETURNS character varying
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_target_value VARCHAR;
BEGIN
    IF p_source_value IS NULL OR TRIM(p_source_value) = '' THEN
        RETURN NULL;
    END IF;
    
    SELECT target_value INTO v_target_value
    FROM supplier_value_mappings
    WHERE supplier_id = p_supplier_id
      AND field_type = p_field_type
      AND LOWER(TRIM(source_value)) = LOWER(TRIM(p_source_value))
      AND is_active = TRUE
    LIMIT 1;
    
    RETURN COALESCE(v_target_value, p_source_value);
END;
$function$
