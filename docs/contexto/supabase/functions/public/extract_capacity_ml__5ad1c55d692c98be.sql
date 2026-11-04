CREATE OR REPLACE FUNCTION public.extract_capacity_ml(p_name text)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_match TEXT[];
    v_value NUMERIC;
BEGIN
    -- 1. Match mL pattern (word boundary \M prevents false positives)
    v_match := regexp_match(p_name, '(\d+(?:[.,]\d+)?)\s*(ml)\M', 'i');
    IF v_match IS NOT NULL THEN
        v_value := REPLACE(v_match[1], ',', '.')::NUMERIC;
        RETURN v_value::INTEGER;
    END IF;
    
    -- 2. Match L/litro/litros with word boundary
    --    Supports apostrophe as decimal separator (SPOT pattern: 2'5 L → 2500 mL)
    v_match := regexp_match(p_name, '(\d+[''.,]?\d*)\s*(litros?|l)\M', 'i');
    IF v_match IS NOT NULL THEN
        v_value := REPLACE(REPLACE(v_match[1], '''', '.'), ',', '.')::NUMERIC;
        v_value := v_value * 1000;
        RETURN v_value::INTEGER;
    END IF;
    
    RETURN NULL;
END;
$function$
