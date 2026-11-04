CREATE OR REPLACE FUNCTION public.fn_extract_numeric(p_value text)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_clean TEXT;
    v_result DECIMAL;
BEGIN
    IF p_value IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Remove tudo exceto números, ponto e vírgula
    v_clean := REGEXP_REPLACE(p_value, '[^0-9.,]', '', 'g');
    
    -- Troca vírgula por ponto
    v_clean := REPLACE(v_clean, ',', '.');
    
    -- Se tiver múltiplos pontos, mantém apenas o último como decimal
    IF LENGTH(v_clean) - LENGTH(REPLACE(v_clean, '.', '')) > 1 THEN
        v_clean := REPLACE(v_clean, '.', '', LENGTH(v_clean) - POSITION('.' IN REVERSE(v_clean)));
    END IF;
    
    BEGIN
        v_result := v_clean::DECIMAL;
    EXCEPTION WHEN OTHERS THEN
        v_result := NULL;
    END;
    
    RETURN v_result;
END;
$function$
