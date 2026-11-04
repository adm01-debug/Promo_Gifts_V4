CREATE OR REPLACE FUNCTION public.fn_apply_transform(p_value text, p_transform_type character varying, p_transform_config jsonb, p_source_unit character varying, p_target_unit character varying, p_supplier_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
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
    -- Transforms que ignoram valor de entrada: bypass null-check
    IF p_transform_type = 'constant' THEN RETURN p_transform_config->>'value'; END IF;
    IF p_transform_type = 'custom' AND p_transform_config IS NOT NULL
       AND (p_transform_config->>'op') = 'constant' THEN
        RETURN p_transform_config->>'value';
    END IF;
    IF p_value IS NULL OR TRIM(p_value) = '' THEN RETURN NULL; END IF;

    CASE p_transform_type

        WHEN 'direct' THEN v_result := p_value;

        WHEN 'constant' THEN v_result := p_transform_config->>'value';

        WHEN 'generate_short_description' THEN
            BEGIN
                DECLARE
                    v_max_chars   INT  := COALESCE((p_transform_config->>'max_chars')::INT,  200);
                    v_min_sent    INT  := COALESCE((p_transform_config->>'min_sentence')::INT, 30);
                    v_hard_cap    INT  := COALESCE((p_transform_config->>'hard_cap')::INT,   250);
                    v_norm        TEXT;
                    v_dot_pos     INT;
                    v_first_sent  TEXT;
                    v_word_trunc  TEXT;
                BEGIN
                    IF length(trim(p_value)) <= v_max_chars THEN
                        v_result := trim(p_value);
                    ELSE
                        v_norm := regexp_replace(trim(p_value), E'[\\r\\n]+', '. ', 'g');
                        v_dot_pos := position('.' IN v_norm);
                        v_first_sent := CASE WHEN v_dot_pos > 0 THEN trim(left(v_norm, v_dot_pos)) ELSE '' END;
                        v_word_trunc := trim(left(p_value,
                            v_max_chars - position(' ' IN reverse(left(p_value, v_max_chars)))));
                        IF length(v_first_sent) BETWEEN v_min_sent AND v_hard_cap THEN
                            v_result := v_first_sent;
                        ELSE
                            v_result := left(v_word_trunc, v_hard_cap);
                        END IF;
                    END IF;
                EXCEPTION WHEN OTHERS THEN v_result := left(trim(p_value), v_hard_cap); END;
            END;

        WHEN 'multiply' THEN
            BEGIN
                v_multiplier := COALESCE((p_transform_config->>'multiplier')::DECIMAL,
                                         (p_transform_config->>'factor')::DECIMAL);
                IF v_multiplier IS NULL THEN RETURN p_value; END IF;
                v_numeric := p_value::DECIMAL;
                v_result := TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM
                              ROUND(v_numeric * v_multiplier, 4)::TEXT));
            EXCEPTION WHEN OTHERS THEN v_result := p_value; END;

        WHEN 'divide' THEN
            BEGIN
                v_multiplier := COALESCE((p_transform_config->>'divisor')::DECIMAL,
                                         (p_transform_config->>'factor')::DECIMAL);
                IF v_multiplier IS NULL OR v_multiplier = 0 THEN RETURN p_value; END IF;
                v_numeric := p_value::DECIMAL;
                v_result := TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM
                              ROUND(v_numeric / v_multiplier, 4)::TEXT));
            EXCEPTION WHEN OTHERS THEN v_result := p_value; END;

        WHEN 'convert_unit' THEN
            BEGIN
                v_numeric := p_value::DECIMAL;
                v_result  := public.fn_convert_unit(v_numeric, p_source_unit, p_target_unit,
                                                    p_supplier_id)::TEXT;
            EXCEPTION WHEN OTHERS THEN v_result := p_value; END;

        WHEN 'lookup' THEN
            v_result := public.fn_map_value(p_supplier_id,
                                            p_transform_config->>'lookup_type', p_value);

        WHEN 'extract_keywords_lookup' THEN
            BEGIN
                v_ftype := COALESCE(p_transform_config->>'field_type', 'material');
                SELECT to_jsonb(
                    COALESCE(
                        array_agg(DISTINCT svm.target_value ORDER BY svm.target_value)
                        FILTER (WHERE svm.target_value IS NOT NULL),
                        ARRAY[]::text[]
                    )
                )::TEXT
                INTO v_result
                FROM public.supplier_value_mappings svm
                WHERE svm.supplier_id = p_supplier_id
                  AND svm.field_type  = v_ftype
                  AND svm.is_active   = TRUE
                  AND UPPER(p_value)  LIKE '%' || UPPER(svm.source_value) || '%';
                IF v_result IS NULL OR v_result = '[]' OR v_result = 'null' THEN
                  v_result := NULL;
                END IF;
            EXCEPTION WHEN OTHERS THEN v_result := NULL; END;

        -- [SM-FIX-v3] extract_dominant_technique com boundary UV correto
        WHEN 'extract_dominant_technique' THEN
            BEGIN
                IF upper(trim(p_value)) IN ('LAS1','SER1','UV1') THEN
                    v_result := upper(trim(p_value));
                ELSIF lower(p_value) ~* 'laser' AND lower(p_value) ~* '(silk|screen|serigrafia|silkscreen)' THEN
                    v_result := 'LAS1';
                ELSIF lower(p_value) ~* 'laser' AND lower(p_value) ~* 'digital' THEN
                    v_result := 'LAS1';
                ELSIF lower(p_value) ~* '\mlaser\M' THEN
                    v_result := 'LAS1';
                ELSIF lower(p_value) ~* '(silk|screen|serigrafia|silkscreen)' THEN
                    v_result := 'SER1';
                -- [FIX B20] UV com word-boundary \m\M para capturar "Gravação UV" (sem espaço após)
                ELSIF lower(p_value) ~* '(digital|\muv\M)' THEN
                    v_result := 'UV1';
                ELSIF lower(p_value) ~* 'sem grava' THEN
                    v_result := NULL;
                ELSE
                    v_result := NULL;
                END IF;
            EXCEPTION WHEN OTHERS THEN v_result := NULL; END;

        WHEN 'bool_sim_nao' THEN
            v_result := CASE
                WHEN lower(trim(p_value)) IN ('sim','s','yes','y','1','true','t') THEN 'true'
                WHEN lower(trim(p_value)) IN ('não','nao','n','no','0','false','f') THEN 'false'
                ELSE public.fn_safe_bool(p_value)::TEXT
            END;

        WHEN 'warranty_parse' THEN
            BEGIN
                IF p_value ~* '(\d+)\s*m[êe]s' THEN
                    v_result := (regexp_match(p_value, '(\d+)\s*m[êe]s'))[1];
                ELSIF p_value ~* '(\d+)\s*ano' THEN
                    v_result := ((regexp_match(p_value, '(\d+)\s*ano'))[1]::int * 12)::text;
                ELSE v_result := NULL; END IF;
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
                    WHEN v_op = 'constant'   THEN v_result := p_transform_config->>'value';
                    ELSE v_result := p_value;
                END CASE;
            EXCEPTION WHEN OTHERS THEN v_result := p_value; END;

        WHEN 'cast_integer'  THEN v_result := public.fn_safe_int(p_value)::TEXT;
        WHEN 'cast_decimal'  THEN v_result := public.fn_safe_num(p_value)::TEXT;
        WHEN 'cast_datetime' THEN
            BEGIN
                v_result := CASE WHEN p_value ~ '^\d{4}-\d{2}-\d{2}'
                                 THEN LEFT(p_value, 10) ELSE NULL END;
            EXCEPTION WHEN OTHERS THEN v_result := NULL; END;
        WHEN 'cast_boolean'  THEN v_result := public.fn_safe_bool(p_value)::TEXT;
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
            -- Filtro URL: remove fragmentos inválidos (ex: 'https:/') quando validate_urls='true'
            -- ou quando nenhum elemento seria válido como URL completa mas algum tem protocolo.
            -- Por padrão, filtra elementos não-vazios; com validate_urls sempre filtra URLs quebradas.
            IF COALESCE(p_transform_config->>'validate_urls', 'false') = 'true' THEN
                v_result := (
                    SELECT to_jsonb(COALESCE(
                        array_agg(BTRIM(e) ORDER BY ord) FILTER (
                            WHERE BTRIM(e) <> ''
                              AND length(BTRIM(e)) >= 12
                              AND BTRIM(e) ~ '^https?://[a-zA-Z0-9]'
                        ),
                        ARRAY[]::text[]))::TEXT
                    FROM unnest(string_to_array(p_value,
                         COALESCE(p_transform_config->>'delimiter', ',')))
                         WITH ORDINALITY AS t(e, ord)
                );
            ELSE
                v_result := (
                    SELECT to_jsonb(COALESCE(
                        array_agg(BTRIM(e)) FILTER (WHERE BTRIM(e) <> ''),
                        ARRAY[]::text[]))::TEXT
                    FROM unnest(string_to_array(p_value,
                         COALESCE(p_transform_config->>'delimiter', ','))) AS e
                );
            END IF;
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

        -- [SM-FIX-v3] dim_to_cm: fallback para labels com dígito antes de ":"
        WHEN 'dim_to_cm' THEN
            BEGIN
                DECLARE
                    v_dim_str TEXT := TRIM(p_value);
                    v_src_unit TEXT := LOWER(COALESCE(p_source_unit, p_transform_config->>'unit', 'cm'));
                    v_divisor DECIMAL := CASE v_src_unit WHEN 'mm' THEN 10 WHEN 'm' THEN 0.01 ELSE 1 END;
                    v_h DECIMAL; v_w DECIMAL; v_l DECIMAL;
                    v_rx TEXT := '(\d+(?:[.,]\d+)?)';
                BEGIN
                    -- 1. Strip label prefix (letras sem dígitos antes de ":")
                    v_dim_str := regexp_replace(v_dim_str, '^[^:0-9]*:\s*', '');
                    -- 2. First component
                    v_dim_str := split_part(v_dim_str, '/', 1);
                    v_dim_str := TRIM(v_dim_str);
                    -- 3. Strip trailing unit
                    v_dim_str := REGEXP_REPLACE(v_dim_str, '\s*(mm|cm|m)\s*(?:\(.*?\))?$', '', 'i');
                    -- 4. Strip Ø markers
                    v_dim_str := regexp_replace(v_dim_str, '[Øø∅]', '', 'g');
                    v_dim_str := TRIM(v_dim_str);

                    IF v_dim_str ~ '^\d' THEN
                        -- Caminho padrão: string já começa com dígito
                        v_matches := REGEXP_MATCHES(v_dim_str,
                          v_rx || '(?:\s*[xX]\s*' || v_rx || ')?(?:\s*[xX]\s*' || v_rx || ')?');
                    ELSIF v_dim_str ~ '\d+[.,]?\d*\s*[xX]\s*\d' THEN
                        -- [SM-FIX-v3 A08] Fallback: label com dígito antes de ":" (ex: "Faca 8":")
                        -- Encontra PRIMEIRO padrão "num x num" em qualquer posição
                        v_matches := REGEXP_MATCHES(v_dim_str,
                          v_rx || '\s*[xX]\s*' || v_rx || '(?:\s*[xX]\s*' || v_rx || ')?');
                    END IF;

                    IF v_matches IS NOT NULL THEN
                        v_h := REPLACE(v_matches[1], ',', '.')::DECIMAL / v_divisor;
                        v_w := CASE WHEN v_matches[2] IS NOT NULL
                                    THEN REPLACE(v_matches[2], ',', '.')::DECIMAL / v_divisor END;
                        v_l := CASE WHEN v_matches[3] IS NOT NULL
                                    THEN REPLACE(v_matches[3], ',', '.')::DECIMAL / v_divisor END;
                        IF v_h = 0 AND (v_w IS NULL OR v_w = 0) THEN
                            v_result := NULL;
                        ELSIF p_transform_config->>'position' IS NOT NULL THEN
                            v_result := CASE (p_transform_config->>'position')::int
                                WHEN 1 THEN CASE WHEN v_h > 0 THEN ROUND(v_h, 2)::TEXT ELSE NULL END
                                WHEN 2 THEN CASE WHEN v_w IS NOT NULL AND v_w > 0 THEN ROUND(v_w, 2)::TEXT ELSE NULL END
                                WHEN 3 THEN CASE WHEN v_l IS NOT NULL AND v_l > 0 THEN ROUND(v_l, 2)::TEXT ELSE NULL END
                                ELSE ROUND(v_h, 2)::TEXT
                            END;
                        ELSE
                            v_result := jsonb_build_object(
                                'h', ROUND(v_h, 2),
                                'w', CASE WHEN v_w IS NOT NULL THEN ROUND(v_w, 2) END,
                                'l', CASE WHEN v_l IS NOT NULL THEN ROUND(v_l, 2) END
                            )::TEXT;
                        END IF;
                    END IF;
                EXCEPTION WHEN OTHERS THEN v_result := NULL; END;
            END;

        ELSE v_result := p_value;
    END CASE;

    IF v_result IS NOT NULL AND p_transform_config IS NOT NULL
       AND (p_transform_config->>'max_length') IS NOT NULL THEN
        v_max_length := (p_transform_config->>'max_length')::INTEGER;
        IF v_max_length > 0 AND length(v_result) > v_max_length THEN
            v_result := LEFT(v_result, v_max_length);
        END IF;
    END IF;

    RETURN v_result;
END;
$function$
