CREATE OR REPLACE FUNCTION public.fn_format_dimensions_display(p_length_cm numeric, p_width_cm numeric, p_height_cm numeric DEFAULT NULL::numeric)
 RETURNS character varying
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result TEXT;
BEGIN
    IF p_length_cm IS NULL AND p_width_cm IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Formatar com vírgula como separador decimal
    v_result := REPLACE(COALESCE(p_length_cm, 0)::DECIMAL(10,1)::TEXT, '.', ',');
    
    IF p_width_cm IS NOT NULL THEN
        v_result := v_result || ' x ' || REPLACE(p_width_cm::DECIMAL(10,1)::TEXT, '.', ',');
    END IF;
    
    IF p_height_cm IS NOT NULL THEN
        v_result := v_result || ' x ' || REPLACE(p_height_cm::DECIMAL(10,1)::TEXT, '.', ',');
    END IF;
    
    RETURN v_result || ' cm';
END;
$function$
