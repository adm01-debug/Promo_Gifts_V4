CREATE OR REPLACE FUNCTION public.convert_string_to_unit(p_input text, p_target_unit text)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_parsed RECORD;
BEGIN
    SELECT * INTO v_parsed FROM parse_unit_from_string(p_input);
    
    IF v_parsed.valor IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN normalize_unit(v_parsed.valor, v_parsed.unidade, p_target_unit);
END;
$function$
