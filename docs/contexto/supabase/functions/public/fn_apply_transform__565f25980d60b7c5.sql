CREATE OR REPLACE FUNCTION public.fn_apply_transform(p_value text, p_transform_type text, p_transform_config jsonb DEFAULT NULL::jsonb, p_supplier_id uuid DEFAULT NULL::uuid)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- NULL in = NULL out
    IF p_value IS NULL OR p_value = '' THEN
        RETURN p_value;
    END IF;

    CASE p_transform_type

        WHEN 'direct' THEN
            RETURN p_value;

        WHEN 'custom' THEN
            -- Aplica prefix e/ou suffix da config
            IF p_transform_config IS NOT NULL THEN
                IF p_transform_config->>'prefix' IS NOT NULL THEN
                    p_value := (p_transform_config->>'prefix') || p_value;
                END IF;
                IF p_transform_config->>'suffix' IS NOT NULL THEN
                    p_value := p_value || (p_transform_config->>'suffix');
                END IF;
            END IF;
            RETURN p_value;

        WHEN 'multiply' THEN
            -- Multiplica valor numérico pelo factor
            IF p_transform_config IS NOT NULL AND p_transform_config->>'factor' IS NOT NULL THEN
                RETURN (p_value::NUMERIC * (p_transform_config->>'factor')::NUMERIC)::TEXT;
            END IF;
            RETURN p_value;

        WHEN 'cast' THEN
            -- Cast simples, tipo inferido no destino
            RETURN p_value;

        WHEN 'jsonpath' THEN
            -- Valor já extraído pelo source_field flattenado
            RETURN p_value;

        WHEN 'lookup' THEN
            -- Placeholder para lookups futuros
            RETURN p_value;

        WHEN 'prefix' THEN
            -- Tipo alternativo de prefix
            IF p_transform_config IS NOT NULL AND p_transform_config->>'prefix' IS NOT NULL THEN
                RETURN (p_transform_config->>'prefix') || p_value;
            END IF;
            RETURN p_value;

        ELSE
            -- Tipo desconhecido, retorna valor original
            RETURN p_value;

    END CASE;
END;
$function$
