CREATE OR REPLACE FUNCTION public.fn_parse_capacity_ml(p_capacity text)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_input TEXT;
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

    -- PATCH M3 2026-06-11: vírgula decimal BR ("1,5 L"→1.5 L) convertida ANTES
    -- do split multivalor. Só converte (\d),(\d{1,2}) imediatamente seguido de
    -- unidade de volume — preserva separador multivalor ("400 mL, 550mL", a
    -- vírgula é precedida de letra) e milhar de 3 dígitos ("2,250 mL", \d{1,2}
    -- não casa 3 dígitos com unidade logo após).
    v_input := REGEXP_REPLACE(p_capacity, '(\d),(\d{1,2})(\s*(?:ml|l|litros?)\M)', '\1.\2\3', 'gi');

    v_parts := string_to_array(v_input, ',');

    FOREACH v_part IN ARRAY v_parts
    LOOP
        v_part := TRIM(v_part);
        IF v_part = '' THEN CONTINUE; END IF;

        v_value := fn_extract_numeric(v_part);
        IF v_value IS NULL THEN CONTINUE; END IF;

        v_unit := LOWER(v_part);

        IF v_unit LIKE '%ml%' OR v_unit LIKE '%mililitro%' THEN
            v_result := v_value::INT;
        ELSIF v_unit ~ '(litros?|\dl\s*$|\dl$|\d\s+l\s*$|\d\s+l\s)' THEN
            v_result := (v_value * 1000)::INT;
        ELSIF v_unit LIKE '%gal%' THEN
            v_result := (v_value * 3785.41)::INT;
        ELSE
            v_result := v_value::INT;
        END IF;

        IF v_max_result IS NULL OR v_result > v_max_result THEN
            v_max_result := v_result;
        END IF;
    END LOOP;

    RETURN v_max_result;
END;
$function$
