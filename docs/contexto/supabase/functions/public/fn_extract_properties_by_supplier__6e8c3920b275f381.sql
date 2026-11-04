CREATE OR REPLACE FUNCTION public.fn_extract_properties_by_supplier(p_raw_properties text, p_supplier_code text DEFAULT 'spot'::text)
 RETURNS TABLE(property_code text, property_value text, raw_value text, matched_pattern text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_prop TEXT;
    v_mapping RECORD;
    v_found BOOLEAN;
BEGIN
    IF p_raw_properties IS NULL OR TRIM(p_raw_properties) = '' THEN
        RETURN;
    END IF;

    -- Para cada property na string
    FOR v_prop IN 
        SELECT TRIM(unnest(string_to_array(p_raw_properties, ',')))
    LOOP
        IF v_prop IS NULL OR TRIM(v_prop) = '' THEN
            CONTINUE;
        END IF;
        
        v_found := FALSE;
        
        -- Buscar mapeamento na tabela (ordenado por prioridade DESC)
        FOR v_mapping IN 
            SELECT spm.property_code, spm.raw_pattern
            FROM supplier_property_mappings spm
            WHERE spm.supplier_code = p_supplier_code
              AND spm.active = TRUE
              AND v_prop ILIKE spm.raw_pattern
            ORDER BY spm.priority DESC
            LIMIT 1
        LOOP
            property_code := v_mapping.property_code;
            property_value := NULL;
            raw_value := v_prop;
            matched_pattern := v_mapping.raw_pattern;
            v_found := TRUE;
            RETURN NEXT;
        END LOOP;
        
        -- Se não encontrou mapeamento, criar código genérico
        IF NOT v_found THEN
            property_code := 'OTHER_' || UPPER(REGEXP_REPLACE(SUBSTRING(v_prop, 1, 30), '[^a-zA-Z0-9]', '_', 'g'));
            property_value := NULL;
            raw_value := v_prop;
            matched_pattern := NULL;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$function$
