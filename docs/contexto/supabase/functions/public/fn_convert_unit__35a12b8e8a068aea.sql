CREATE OR REPLACE FUNCTION public.fn_convert_unit(p_value numeric, p_source_unit character varying, p_target_unit character varying, p_supplier_id uuid DEFAULT NULL::uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_multiplier DECIMAL;
BEGIN
    -- Se valor nulo, retorna nulo
    IF p_value IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Se unidades iguais, retorna valor original
    IF LOWER(TRIM(p_source_unit)) = LOWER(TRIM(p_target_unit)) THEN
        RETURN p_value;
    END IF;
    
    -- Buscar conversão (primeiro específica do fornecedor, depois global)
    SELECT multiplier INTO v_multiplier
    FROM supplier_unit_conversions
    WHERE LOWER(source_unit) = LOWER(TRIM(p_source_unit))
      AND LOWER(target_unit) = LOWER(TRIM(p_target_unit))
      AND (supplier_id = p_supplier_id OR supplier_id IS NULL)
      AND is_active = TRUE
    ORDER BY supplier_id NULLS LAST
    LIMIT 1;
    
    IF v_multiplier IS NULL THEN
        RAISE WARNING 'Conversão não encontrada: % → %', p_source_unit, p_target_unit;
        RETURN p_value;
    END IF;
    
    RETURN ROUND(p_value * v_multiplier, 4);
END;
$function$
