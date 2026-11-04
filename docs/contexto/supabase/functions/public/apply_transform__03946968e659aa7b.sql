CREATE OR REPLACE FUNCTION public.apply_transform(p_value text, p_transform_type character varying, p_transform_config jsonb DEFAULT NULL::jsonb)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_numeric_value NUMERIC;
    v_factor NUMERIC;
    v_result TEXT;
    v_pattern TEXT;
    v_group INTEGER;
    v_matches TEXT[];
BEGIN
    IF p_value IS NULL THEN
        RETURN NULL;
    END IF;
    
    CASE LOWER(p_transform_type)
        WHEN 'direct' THEN
            RETURN p_value;
        
        WHEN 'multiply' THEN
            BEGIN
                v_numeric_value := p_value::NUMERIC;
                v_factor := (p_transform_config->>'factor')::NUMERIC;
                RETURN (v_numeric_value * v_factor)::TEXT;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Erro em multiply transform: %', SQLERRM;
                RETURN p_value;
            END;
        
        WHEN 'divide' THEN
            BEGIN
                v_numeric_value := p_value::NUMERIC;
                v_factor := (p_transform_config->>'factor')::NUMERIC;
                IF v_factor = 0 THEN
                    RAISE WARNING 'Tentativa de divisão por zero';
                    RETURN p_value;
                END IF;
                RETURN (v_numeric_value / v_factor)::TEXT;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Erro em divide transform: %', SQLERRM;
                RETURN p_value;
            END;
        
        WHEN 'prefix' THEN
            RETURN (p_transform_config->>'prefix') || p_value;
        
        WHEN 'suffix' THEN
            RETURN p_value || (p_transform_config->>'suffix');
        
        WHEN 'uppercase' THEN
            RETURN UPPER(p_value);
        
        WHEN 'lowercase' THEN
            RETURN LOWER(p_value);
        
        WHEN 'trim' THEN
            RETURN TRIM(p_value);
        
        WHEN 'replace' THEN
            RETURN REPLACE(
                p_value,
                p_transform_config->>'find',
                p_transform_config->>'replace'
            );
        
        WHEN 'regex_extract' THEN
            BEGIN
                v_pattern := p_transform_config->>'pattern';
                v_group := COALESCE((p_transform_config->>'group')::INTEGER, 1);
                v_matches := regexp_matches(p_value, v_pattern);
                IF array_length(v_matches, 1) >= v_group THEN
                    RETURN v_matches[v_group];
                ELSE
                    RETURN NULL;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Erro em regex_extract: %', SQLERRM;
                RETURN p_value;
            END;
        
        ELSE
            RAISE WARNING 'Transform type não suportado: %', p_transform_type;
            RETURN p_value;
    END CASE;
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro em apply_transform: %', SQLERRM;
    RETURN p_value;
END;
$function$
