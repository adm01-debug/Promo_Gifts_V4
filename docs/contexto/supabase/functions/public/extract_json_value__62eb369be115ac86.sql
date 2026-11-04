CREATE OR REPLACE FUNCTION public.extract_json_value(p_data jsonb, p_path character varying)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
    v_text TEXT;
BEGIN
    IF p_data IS NULL OR p_path IS NULL THEN
        RETURN NULL;
    END IF;
    
    BEGIN
        v_result := jsonb_path_query_first(p_data, p_path::jsonpath);
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'JSONPath inválido: % | Erro: %', p_path, SQLERRM;
        RETURN NULL;
    END;
    
    IF v_result IS NULL THEN
        RETURN NULL;
    END IF;
    
    CASE jsonb_typeof(v_result)
        WHEN 'string' THEN
            v_text := v_result #>> '{}';
        WHEN 'number' THEN
            v_text := v_result::TEXT;
        WHEN 'boolean' THEN
            v_text := v_result::TEXT;
        WHEN 'null' THEN
            v_text := NULL;
        ELSE
            v_text := v_result::TEXT;
    END CASE;
    
    RETURN v_text;
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro em extract_json_value: %', SQLERRM;
    RETURN NULL;
END;
$function$
