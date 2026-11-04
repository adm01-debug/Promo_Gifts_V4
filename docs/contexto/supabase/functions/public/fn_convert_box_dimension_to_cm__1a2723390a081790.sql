CREATE OR REPLACE FUNCTION public.fn_convert_box_dimension_to_cm(p_value text)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_num DECIMAL;
BEGIN
    IF p_value IS NULL OR TRIM(p_value) = '' THEN
        RETURN NULL;
    END IF;
    
    v_num := p_value::DECIMAL;
    
    -- Detectar automaticamente:
    -- Se valor < 10, provavelmente está em METROS (ex: 0.42)
    -- Se valor >= 10, provavelmente está em MILÍMETROS (ex: 420)
    
    IF v_num < 10 THEN
        -- Valor em METROS → multiplicar por 100 para cm
        RETURN ROUND(v_num * 100, 2);
    ELSE
        -- Valor em MILÍMETROS → dividir por 10 para cm
        RETURN ROUND(v_num / 10, 2);
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$function$
