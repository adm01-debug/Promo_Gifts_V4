-- ============================================================
-- FIX 1: extract_capacity_ml
-- Bugs: LEDs false positive, no apostrophe decimal support
-- Fix: \M word boundary + apostrophe handling
-- ============================================================
CREATE OR REPLACE FUNCTION public.extract_capacity_ml(p_name text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
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
$function$;

-- ============================================================
-- FIX 2: fn_extract_capacity_from_name
-- Bugs: LEDs false positive, no apostrophe support
-- Fix: \M word boundary + apostrophe + ceiling kept at 10000
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_extract_capacity_from_name(p_name text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
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
$function$;

-- ============================================================
-- FIX 3: fn_parse_capacity_ml
-- Bug: não tratava multi-valor ("480 mL, 760mL" → concatenava)
-- Fix: split por vírgula + regra MAIOR VALOR
--      + regex mais preciso para L isolado
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_parse_capacity_ml(p_capacity text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
    v_part TEXT;
    v_parts TEXT[];
    v_value DECIMAL;
    v_unit TEXT;
    v_result INT;
    v_max_result INT := NULL;
BEGIN
    IF p_capacity IS NULL OR TRIM(p_capacity) = '' THEN
        RETURN NULL;
    END IF;
    
    -- Split by comma for multi-value ("480 mL, 760mL" → ["480 mL", "760mL"])
    v_parts := string_to_array(p_capacity, ',');
    
    FOREACH v_part IN ARRAY v_parts
    LOOP
        v_part := TRIM(v_part);
        IF v_part = '' THEN CONTINUE; END IF;
        
        -- Extract numeric value
        v_value := fn_extract_numeric(v_part);
        IF v_value IS NULL THEN CONTINUE; END IF;
        
        -- Detect unit (check mL BEFORE L to avoid false match)
        v_unit := LOWER(v_part);
        
        IF v_unit LIKE '%ml%' OR v_unit LIKE '%mililitro%' THEN
            v_result := v_value::INT;
        ELSIF v_unit ~ '(litros?|\dl\s*$|\dl$|\d\s+l\s*$|\d\s+l\s)' THEN
            v_result := (v_value * 1000)::INT;
        ELSIF v_unit LIKE '%gal%' THEN
            v_result := (v_value * 3785.41)::INT;
        ELSE
            -- Assume mL if no unit specified
            v_result := v_value::INT;
        END IF;
        
        -- MAIOR VALOR rule: keep the maximum
        IF v_max_result IS NULL OR v_result > v_max_result THEN
            v_max_result := v_result;
        END IF;
    END LOOP;
    
    RETURN v_max_result;
END;
$function$;
