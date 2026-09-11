-- Adiciona case 'extract_keywords_lookup' ao fn_apply_transform custom section.
-- Varre supplier_value_mappings[field_type] buscando source_values como keywords no p_value (título).
-- Retorna jsonb TEXT[] de todos os matches — conecta supplier_value_mappings ao pipeline.
CREATE OR REPLACE FUNCTION public.fn_apply_transform(
  p_value          text,
  p_transform_type character varying,
  p_transform_config jsonb,
  p_source_unit    character varying,
  p_target_unit    character varying,
  p_supplier_id    uuid
)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $fn$
DECLARE
    v_result     TEXT;
    v_numeric    DECIMAL;
    v_multiplier DECIMAL;
    v_fn         VARCHAR;
    v_op         VARCHAR;
    v_pattern    TEXT;
    v_group      INTEGER;
    v_matches    TEXT[];
    v_max_length INTEGER;
    v_ftype      TEXT;
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
                              TRIM(TRAILING '0' FROM
                                ROUND(v_numeric * v_multiplier, 4)::TEXT));
            EXCEPTION WHEN OTHERS THEN v_result := p_value; END;

        WHEN 'divide' THEN
            BEGIN
                v_multiplier := COALESCE((p_transform_config->>'divisor')::DECIMAL,
                                         (p_transform_config->>'factor')::DECIMAL);
                IF v_multiplier IS NULL OR v_multiplier = 0 THEN RETURN p_value; END IF;
                v_numeric := p_value::DECIMAL;
                v_result := TRIM(TRAILING '.' FROM
                              TRIM(TRAILING '0' FROM
                                ROUND(v_numeric / v_multiplier, 4)::TEXT));
            EXCEPTION WHEN OTHERS THEN v_result := p_value; END;

        WHEN 'convert_unit' THEN
            BEGIN
                v_numeric := p_value::DECIMAL;
                v_result  := public.fn_convert_unit(v_numeric, p_source_unit, p_target_unit,
                                                    p_supplier_id)::TEXT;
            EXCEPTION WHEN OTHERS THEN v_result := p_value; END;

        -- ── Lookup simples: supplier_value_mappings ─────────────────────────
        WHEN 'lookup' THEN
            v_result := public.fn_map_value(p_supplier_id,
                                            p_transform_config->>'lookup_type', p_value);

        -- ── Keyword scan: extrai todos os source_values que aparecem em p_value ──
        -- Ex: titulo "GARRAFA EM ALUMÍNIO BRANCO" → ["Alumínio"]
        -- Usa supplier_value_mappings[field_type='material' (ou outro)] como dicionário.
        WHEN 'extract_keywords_lookup' THEN
            BEGIN
                v_ftype := COALESCE(p_transform_config->>'field_type', 'material');
                SELECT to_jsonb(
                    COALESCE(
                        array_agg(DISTINCT svm.source_value ORDER BY svm.source_value)
                        FILTER (WHERE svm.source_value IS NOT NULL),
                        ARRAY[]::text[]
                    )
                )::TEXT
                INTO v_result
                FROM public.supplier_value_mappings svm
                WHERE svm.supplier_id = p_supplier_id
                  AND svm.field_type  = v_ftype
                  AND svm.is_active   = TRUE
                  AND UPPER(p_value)  LIKE '%' || UPPER(svm.source_value) || '%';

                -- Se não encontrou nenhum → null (não sobrescreve)
                IF v_result = '[]' OR v_result = 'null' THEN v_result := NULL; END IF;
            EXCEPTION WHEN OTHERS THEN v_result := NULL; END;

        WHEN 'custom' THEN
            BEGIN
                v_fn := p_transform_config->>'function';
                v_op := p_transform_config->>'op';
                CASE
                    WHEN v_fn = 'fn_parse_capacity_ml'           THEN v_result := public.fn_parse_capacity_ml(p_value)::TEXT;
                    WHEN v_fn = 'fn_convert_box_dimension_to_cm' THEN v_result := public.fn_convert_box_dimension_to_cm(p_value)::TEXT;
                    WHEN v_fn = 'fn_clean_spot_name'             THEN v_result := public.fn_clean_spot_name(p_value);
                    WHEN v_fn = 'fn_normalize_ncm'               THEN v_result := public.fn_normalize_ncm(p_value)::TEXT;
                    WHEN v_fn = 'fn_spot_split_list'             THEN v_result := public.fn_spot_split_list(p_value)::TEXT;
                    WHEN v_fn = 'fn_spot_image_list'             THEN v_result := public.fn_spot_image_list(
                                                                          p_value,
                                                                          COALESCE(p_transform_config->>'base',
                                                                                   'https://www.spotgifts.com.br/fotos/produtos/')
                                                                        )::TEXT;
                    WHEN v_op = 'array_url'  THEN v_result := jsonb_build_array(p_value)::TEXT;
                    WHEN v_op = 'is_present' THEN v_result := CASE WHEN NULLIF(TRIM(p_value),'') IS NOT NULL
                                                                    THEN 'true' ELSE 'false' END;
                    ELSE v_result := p_value;
                END CASE;
            EXCEPTION WHEN OTHERS THEN v_result := p_value; END;

        WHEN 'cast_integer' THEN
            v_result := public.fn_safe_int(p_value)::TEXT;

        WHEN 'cast_decimal' THEN
            v_result := public.fn_safe_num(p_value)::TEXT;

        WHEN 'cast_datetime' THEN
            BEGIN
                v_result := CASE WHEN p_value ~ '^\d{4}-\d{2}-\d{2}'
                                 THEN LEFT(p_value, 10)
                                 ELSE NULL END;
            EXCEPTION WHEN OTHERS THEN v_result := NULL; END;

        WHEN 'cast_boolean' THEN
            v_result := public.fn_safe_bool(p_value)::TEXT;

        WHEN 'cast' THEN
            BEGIN
                v_result := CASE COALESCE(p_transform_config->>'to', 'text')
                    WHEN 'boolean' THEN public.fn_safe_bool(p_value)::TEXT
                    WHEN 'integer' THEN public.fn_safe_int(p_value)::TEXT
                    WHEN 'decimal' THEN public.fn_safe_num(p_value)::TEXT
                    ELSE p_value
                END;
            EXCEPTION WHEN OTHERS THEN v_result := p_value; END;

        WHEN 'split_pipe' THEN
            v_result := (
                SELECT to_jsonb(
                    COALESCE(
                        array_agg(BTRIM(e)) FILTER (WHERE BTRIM(e) <> ''),
                        ARRAY[]::text[]
                    )
                )::TEXT
                FROM unnest(string_to_array(p_value,
                     COALESCE(p_transform_config->>'delimiter', ','))) AS e
            );

        WHEN 'prefix' THEN
            IF p_transform_config IS NOT NULL AND p_transform_config->>'prefix' IS NOT NULL THEN
                v_result := (p_transform_config->>'prefix') || p_value;
            ELSE v_result := p_value; END IF;

        WHEN 'suffix' THEN
            IF p_transform_config IS NOT NULL AND p_transform_config->>'suffix' IS NOT NULL THEN
                v_result := p_value || (p_transform_config->>'suffix');
            ELSE v_result := p_value; END IF;

        WHEN 'uppercase' THEN v_result := UPPER(p_value);
        WHEN 'lowercase' THEN v_result := LOWER(p_value);
        WHEN 'trim'      THEN v_result := BTRIM(p_value);

        WHEN 'replace' THEN
            IF p_transform_config IS NOT NULL THEN
                v_result := REPLACE(p_value,
                    COALESCE(p_transform_config->>'find',''),
                    COALESCE(p_transform_config->>'replace',''));
            ELSE v_result := p_value; END IF;

        WHEN 'regex_extract' THEN
            BEGIN
                v_pattern := p_transform_config->>'pattern';
                v_group   := COALESCE((p_transform_config->>'group')::INTEGER, 1);
                IF v_pattern IS NULL THEN RETURN p_value; END IF;
                v_matches := regexp_matches(p_value, v_pattern);
                IF array_length(v_matches, 1) >= v_group THEN v_result := v_matches[v_group];
                ELSE v_result := NULL; END IF;
            EXCEPTION WHEN OTHERS THEN v_result := p_value; END;

        -- Transformações dimensionais (dim_to_cm) — com suporte a símbolo Ø
        WHEN 'dim_to_cm' THEN
            BEGIN
                DECLARE
                    v_dim_str TEXT := TRIM(p_value);
                    v_src_unit TEXT := LOWER(COALESCE(p_source_unit, 'cm'));
                    v_divisor DECIMAL := CASE v_src_unit WHEN 'mm' THEN 10 WHEN 'm' THEN 0.01 ELSE 1 END;
                    v_parts TEXT[];
                    v_h DECIMAL; v_w DECIMAL; v_l DECIMAL;
                    v_rx TEXT := '[Ø∅Oo]?(\d+(?:[.,]\d+)?)';
                BEGIN
                    v_dim_str := REGEXP_REPLACE(v_dim_str, '\s*(mm|cm|m)\s*(?:\(.*?\))?$', '', 'i');
                    v_dim_str := TRIM(v_dim_str);
                    IF v_dim_str ~ '(?i)^[Ø∅Oo]?\d' THEN
                        v_matches := REGEXP_MATCHES(v_dim_str,
                          '(?i)' || v_rx || '(?:\s*[xX]\s*' || v_rx || ')?(?:\s*[xX]\s*' || v_rx || ')?');
                        IF v_matches IS NOT NULL THEN
                            v_h := REPLACE(v_matches[1], ',', '.')::DECIMAL / v_divisor;
                            v_w := CASE WHEN v_matches[2] IS NOT NULL
                                        THEN REPLACE(v_matches[2], ',', '.')::DECIMAL / v_divisor END;
                            v_l := CASE WHEN v_matches[3] IS NOT NULL
                                        THEN REPLACE(v_matches[3], ',', '.')::DECIMAL / v_divisor END;
                            IF v_h = 0 AND (v_w IS NULL OR v_w = 0) THEN
                                v_result := NULL;
                            ELSE
                                v_result := jsonb_build_object(
                                    'h', ROUND(v_h, 2),
                                    'w', CASE WHEN v_w IS NOT NULL THEN ROUND(v_w, 2) END,
                                    'l', CASE WHEN v_l IS NOT NULL THEN ROUND(v_l, 2) END
                                )::TEXT;
                            END IF;
                        END IF;
                    END IF;
                EXCEPTION WHEN OTHERS THEN v_result := NULL; END;
            END;

        ELSE v_result := p_value;
    END CASE;

    -- Truncar ao max_length configurado
    IF v_result IS NOT NULL AND p_transform_config IS NOT NULL
       AND (p_transform_config->>'max_length') IS NOT NULL THEN
        v_max_length := (p_transform_config->>'max_length')::INTEGER;
        IF v_max_length > 0 AND length(v_result) > v_max_length THEN
            v_result := LEFT(v_result, v_max_length);
        END IF;
    END IF;

    RETURN v_result;
END;
$fn$;;
