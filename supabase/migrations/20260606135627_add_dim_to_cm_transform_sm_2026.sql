-- Adiciona transform_type 'dim_to_cm' em fn_apply_transform (versão rica, 6 parâmetros)
-- Extrai a n-ésima dimensão de "AxBxC mm (AxLxP)" e converte para cm
CREATE OR REPLACE FUNCTION public.fn_apply_transform(
    p_value        text,
    p_transform_type character varying,
    p_transform_config jsonb,
    p_source_unit  character varying,
    p_target_unit  character varying,
    p_supplier_id  uuid
)
RETURNS text
LANGUAGE plpgsql STABLE
SET search_path TO 'public'
AS $fn$
DECLARE
    v_result     TEXT;
    v_numeric    DECIMAL;
    v_multiplier DECIMAL;
    v_fn         VARCHAR;
    v_pattern    TEXT;
    v_group      INTEGER;
    v_matches    TEXT[];
    v_max_length INTEGER;
BEGIN
    IF p_value IS NULL OR TRIM(p_value) = '' THEN RETURN NULL; END IF;

    CASE p_transform_type

        WHEN 'direct' THEN
            v_result := p_value;

        WHEN 'multiply' THEN
            BEGIN
                v_multiplier := COALESCE((p_transform_config->>'multiplier')::DECIMAL,
                                         (p_transform_config->>'factor')::DECIMAL);
                IF v_multiplier IS NULL THEN RETURN p_value; END IF;
                v_numeric := p_value::DECIMAL;
                v_result := TRIM(TRAILING '.' FROM
                              TRIM(TRAILING '0' FROM ROUND(v_numeric * v_multiplier, 4)::TEXT));
            EXCEPTION WHEN OTHERS THEN v_result := p_value;
            END;

        WHEN 'divide' THEN
            BEGIN
                v_multiplier := COALESCE((p_transform_config->>'divisor')::DECIMAL,
                                         (p_transform_config->>'factor')::DECIMAL);
                IF v_multiplier IS NULL OR v_multiplier = 0 THEN RETURN p_value; END IF;
                v_numeric := p_value::DECIMAL;
                v_result := TRIM(TRAILING '.' FROM
                              TRIM(TRAILING '0' FROM ROUND(v_numeric / v_multiplier, 4)::TEXT));
            EXCEPTION WHEN OTHERS THEN v_result := p_value;
            END;

        WHEN 'convert_unit' THEN
            BEGIN
                v_numeric := p_value::DECIMAL;
                v_result  := fn_convert_unit(v_numeric, p_source_unit, p_target_unit,
                                             p_supplier_id)::TEXT;
            EXCEPTION WHEN OTHERS THEN v_result := p_value;
            END;

        WHEN 'lookup' THEN
            v_result := fn_map_value(p_supplier_id,
                                     p_transform_config->>'lookup_type', p_value);

        WHEN 'custom' THEN
            BEGIN
                v_fn := p_transform_config->>'function';
                CASE v_fn
                    WHEN 'fn_parse_capacity_ml'
                        THEN v_result := fn_parse_capacity_ml(p_value)::TEXT;
                    WHEN 'fn_convert_box_dimension_to_cm'
                        THEN v_result := fn_convert_box_dimension_to_cm(p_value)::TEXT;
                    WHEN 'fn_clean_spot_name'
                        THEN v_result := fn_clean_spot_name(p_value);
                    WHEN 'fn_normalize_ncm'
                        THEN v_result := fn_normalize_ncm(p_value)::TEXT;
                    ELSE v_result := p_value;
                END CASE;
            EXCEPTION WHEN OTHERS THEN v_result := p_value;
            END;

        WHEN 'prefix' THEN
            IF p_transform_config IS NOT NULL
               AND p_transform_config->>'prefix' IS NOT NULL THEN
                v_result := (p_transform_config->>'prefix') || p_value;
            ELSE v_result := p_value;
            END IF;

        WHEN 'suffix' THEN
            IF p_transform_config IS NOT NULL
               AND p_transform_config->>'suffix' IS NOT NULL THEN
                v_result := p_value || (p_transform_config->>'suffix');
            ELSE v_result := p_value;
            END IF;

        WHEN 'uppercase'  THEN v_result := UPPER(p_value);
        WHEN 'lowercase'  THEN v_result := LOWER(p_value);
        WHEN 'trim'       THEN v_result := BTRIM(p_value);

        WHEN 'replace' THEN
            IF p_transform_config IS NOT NULL THEN
                v_result := REPLACE(p_value,
                                    COALESCE(p_transform_config->>'find', ''),
                                    COALESCE(p_transform_config->>'replace', ''));
            ELSE v_result := p_value;
            END IF;

        WHEN 'regex_extract' THEN
            BEGIN
                v_pattern := p_transform_config->>'pattern';
                v_group   := COALESCE((p_transform_config->>'group')::INTEGER, 1);
                IF v_pattern IS NULL THEN RETURN p_value; END IF;
                v_matches := regexp_matches(p_value, v_pattern);
                IF array_length(v_matches, 1) >= v_group
                    THEN v_result := v_matches[v_group];
                    ELSE v_result := NULL;
                END IF;
            EXCEPTION WHEN OTHERS THEN v_result := p_value;
            END;

        -- ── NOVO: extrai n-ésima dimensão de "AxBxC mm" e converte para cm ──────
        WHEN 'dim_to_cm' THEN
            DECLARE
                v_pos   INTEGER;
                v_unit2 TEXT;
                v_dim   TEXT[];
            BEGIN
                v_pos   := COALESCE((p_transform_config->>'position')::INTEGER, 1);
                v_unit2 := lower(COALESCE(p_transform_config->>'unit', 'cm'));
                -- Normaliza vírgulas como decimais e extrai até 3 números separados por x/X
                v_dim   := regexp_matches(
                               replace(replace(p_value, ',', '.'), ' ', ''),
                               '(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)(?:x(\d+(?:\.\d+)?))?',
                               'i');
                IF v_dim IS NOT NULL
                   AND array_length(v_dim, 1) >= v_pos
                   AND v_dim[v_pos] IS NOT NULL
                   AND v_dim[v_pos] != '0' THEN
                    v_result := CASE v_unit2
                        WHEN 'mm' THEN round(v_dim[v_pos]::numeric / 10, 2)::text
                        ELSE v_dim[v_pos]
                    END;
                ELSE v_result := NULL;
                END IF;
            EXCEPTION WHEN OTHERS THEN v_result := NULL;
            END;
        -- ────────────────────────────────────────────────────────────────────────

        ELSE v_result := p_value;

    END CASE;

    -- Truncar ao max_length se configurado
    IF v_result IS NOT NULL
       AND p_transform_config IS NOT NULL
       AND (p_transform_config->>'max_length') IS NOT NULL THEN
        v_max_length := (p_transform_config->>'max_length')::INTEGER;
        IF v_max_length > 0 AND length(v_result) > v_max_length THEN
            v_result := left(v_result, v_max_length);
        END IF;
    END IF;

    RETURN v_result;
END;
$fn$;;
