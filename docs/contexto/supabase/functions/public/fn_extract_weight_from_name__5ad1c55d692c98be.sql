CREATE OR REPLACE FUNCTION public.fn_extract_weight_from_name(p_name text)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_match TEXT[];
    v_value INTEGER;
BEGIN
    -- Padrão: 500g
    v_match := regexp_match(p_name, '(\d+)\s*(g|gr|gramas)\M', 'i');
    IF v_match IS NOT NULL THEN
        v_value := v_match[1]::INTEGER;
        IF v_value > 0 AND v_value <= 50000 THEN
            RETURN v_value;
        END IF;
    END IF;
    
    -- Padrão: 1.5kg
    v_match := regexp_match(p_name, '(\d+[,.]?\d*)\s*(kg|quilos)', 'i');
    IF v_match IS NOT NULL THEN
        v_value := (REPLACE(v_match[1], ',', '.')::NUMERIC * 1000)::INTEGER;
        IF v_value > 0 AND v_value <= 50000 THEN
            RETURN v_value;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$function$
