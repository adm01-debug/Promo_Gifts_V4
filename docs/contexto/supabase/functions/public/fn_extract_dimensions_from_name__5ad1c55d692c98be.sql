CREATE OR REPLACE FUNCTION public.fn_extract_dimensions_from_name(p_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_match TEXT[];
    v_result JSONB := '{}';
BEGIN
    -- Padrão: 30x20x10 cm
    v_match := regexp_match(p_name, '(\d+[,.]?\d*)\s*[xX×]\s*(\d+[,.]?\d*)\s*[xX×]\s*(\d+[,.]?\d*)\s*(cm|mm)?', 'i');
    IF v_match IS NOT NULL THEN
        v_result := jsonb_build_object(
            'length_cm', REPLACE(v_match[1], ',', '.')::NUMERIC,
            'width_cm', REPLACE(v_match[2], ',', '.')::NUMERIC,
            'height_cm', REPLACE(v_match[3], ',', '.')::NUMERIC
        );
        IF v_match[4] = 'mm' THEN
            v_result := jsonb_build_object(
                'length_cm', (REPLACE(v_match[1], ',', '.')::NUMERIC / 10),
                'width_cm', (REPLACE(v_match[2], ',', '.')::NUMERIC / 10),
                'height_cm', (REPLACE(v_match[3], ',', '.')::NUMERIC / 10)
            );
        END IF;
        RETURN v_result;
    END IF;
    
    -- Padrão: 30x20 cm (2 dimensões)
    v_match := regexp_match(p_name, '(\d+[,.]?\d*)\s*[xX×]\s*(\d+[,.]?\d*)\s*(cm|mm)?', 'i');
    IF v_match IS NOT NULL THEN
        v_result := jsonb_build_object(
            'length_cm', REPLACE(v_match[1], ',', '.')::NUMERIC,
            'width_cm', REPLACE(v_match[2], ',', '.')::NUMERIC
        );
        RETURN v_result;
    END IF;
    
    RETURN NULL;
END;
$function$
