CREATE OR REPLACE FUNCTION public.fn_extract_capacity_from_name(p_name text)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_match TEXT[];
    v_value INTEGER;
BEGIN
    -- 1. Match mL pattern with word boundary
    v_match := regexp_match(p_name, '(\d+)\s*(ml)\M', 'i');
    IF v_match IS NOT NULL THEN
        v_value := v_match[1]::INTEGER;
        IF v_value > 0 AND v_value <= 10000 THEN
            RETURN v_value;
        END IF;
    END IF;
    
    -- 2. Match L/litro/litros with word boundary + apostrophe decimal
    v_match := regexp_match(p_name, '(\d+[''.,]?\d*)\s*(litros?|l)\M', 'i');
    IF v_match IS NOT NULL THEN
        v_value := (REPLACE(REPLACE(v_match[1], '''', '.'), ',', '.')::NUMERIC * 1000)::INTEGER;
        IF v_value > 0 AND v_value <= 10000 THEN
            RETURN v_value;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$function$
