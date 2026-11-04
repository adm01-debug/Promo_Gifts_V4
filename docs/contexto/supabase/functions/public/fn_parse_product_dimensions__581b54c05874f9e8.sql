CREATE OR REPLACE FUNCTION public.fn_parse_product_dimensions(p_dimensions_text text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_original TEXT; v_work_text TEXT; v_unit TEXT; v_unit_factor NUMERIC;
    v_is_diameter BOOLEAN; v_is_axlxp BOOLEAN;
    v_numbers TEXT[]; v_nums NUMERIC[]; v_result JSONB; v_i INT; v_num NUMERIC;
BEGIN
    IF p_dimensions_text IS NULL OR TRIM(p_dimensions_text) = '' THEN
        RETURN jsonb_build_object('error','empty_input','original',p_dimensions_text);
    END IF;
    v_original := TRIM(p_dimensions_text);
    IF POSITION('|' IN v_original) > 0 THEN
        v_work_text := TRIM(SPLIT_PART(v_original,'|',1));
    ELSE
        v_work_text := v_original;
    END IF;
    v_work_text := REPLACE(v_work_text, ',', '.');

    -- PATCH M3 2026-06-11 (guard #1): texto sem indicador dimensional
    -- (sem 'x'/'×' entre tokens, sem ø, sem unidade mm/cm/m) não é dimensão.
    -- Mata falsos positivos tipo "Tamanho 5" (bola) e "Tamanho: 58" (boné).
    IF v_work_text !~* '[x×øØ]' AND v_work_text !~* '\m(mm|cm|m)\M' THEN
        RETURN jsonb_build_object('error','no_dimension_pattern','original',v_original);
    END IF;

    IF v_work_text ~* 'cm' THEN v_unit := 'cm'; v_unit_factor := 1.0;
    ELSIF v_work_text ~* 'mm' THEN v_unit := 'mm'; v_unit_factor := 0.1;
    ELSIF v_work_text ~ '(?<![c])\mm\M(?!m)' THEN v_unit := 'm'; v_unit_factor := 100.0;
    ELSE v_unit := 'mm'; v_unit_factor := 0.1;
    END IF;

    v_is_diameter := (v_work_text ~ '[øØ]');
    v_is_axlxp := (v_work_text ~* '\(\s*[AH]\s*[x×]\s*[LW]\s*[x×]\s*[PD]\s*\)');

    SELECT ARRAY_AGG(m[1]) INTO v_numbers
    FROM REGEXP_MATCHES(v_work_text, '(\d+\.?\d*)', 'g') AS m;
    IF v_numbers IS NULL OR ARRAY_LENGTH(v_numbers,1) IS NULL THEN
        RETURN jsonb_build_object('error','no_numbers','original',v_original);
    END IF;

    v_nums := ARRAY[]::NUMERIC[];
    FOR v_i IN 1..ARRAY_LENGTH(v_numbers,1) LOOP
        v_num := v_numbers[v_i]::NUMERIC;
        IF v_num > 0 THEN v_nums := ARRAY_APPEND(v_nums, v_num); END IF;
    END LOOP;
    IF ARRAY_LENGTH(v_nums,1) IS NULL THEN
        RETURN jsonb_build_object('error','no_valid_numbers','original',v_original);
    END IF;

    -- PATCH M3 2026-06-11 (guard #2): valor convertido > 1000 cm é lixo de feed.
    FOR v_i IN 1..ARRAY_LENGTH(v_nums,1) LOOP
        IF v_nums[v_i] * v_unit_factor > 1000 THEN
            RETURN jsonb_build_object('error','out_of_range','original',v_original);
        END IF;
    END LOOP;

    v_result := jsonb_build_object('original',v_original,'unit_detected',v_unit,
        'shape_type',CASE WHEN v_is_diameter THEN 'cylindrical' ELSE 'rectangular' END,
        'length_cm',NULL,'width_cm',NULL,'height_cm',NULL,'diameter_cm',NULL);

    IF v_is_diameter THEN
        IF ARRAY_LENGTH(v_nums,1) >= 2 THEN
            v_result := v_result || jsonb_build_object(
                'diameter_cm',ROUND(v_nums[1]*v_unit_factor,2),'height_cm',ROUND(v_nums[2]*v_unit_factor,2),
                'length_cm',ROUND(v_nums[1]*v_unit_factor,2),'width_cm',ROUND(v_nums[1]*v_unit_factor,2));
        ELSIF ARRAY_LENGTH(v_nums,1) = 1 THEN
            v_result := v_result || jsonb_build_object(
                'diameter_cm',ROUND(v_nums[1]*v_unit_factor,2),
                'length_cm',ROUND(v_nums[1]*v_unit_factor,2),'width_cm',ROUND(v_nums[1]*v_unit_factor,2));
        END IF;
    ELSIF v_is_axlxp THEN
        IF ARRAY_LENGTH(v_nums,1) >= 3 THEN
            v_result := v_result || jsonb_build_object('height_cm',ROUND(v_nums[1]*v_unit_factor,2),
                'width_cm',ROUND(v_nums[2]*v_unit_factor,2),'length_cm',ROUND(v_nums[3]*v_unit_factor,2));
        ELSIF ARRAY_LENGTH(v_nums,1) >= 2 THEN
            v_result := v_result || jsonb_build_object('height_cm',ROUND(v_nums[1]*v_unit_factor,2),
                'width_cm',ROUND(v_nums[2]*v_unit_factor,2));
        END IF;
    ELSE
        IF ARRAY_LENGTH(v_nums,1) >= 3 THEN
            v_result := v_result || jsonb_build_object('width_cm',ROUND(v_nums[1]*v_unit_factor,2),
                'height_cm',ROUND(v_nums[2]*v_unit_factor,2),'length_cm',ROUND(v_nums[3]*v_unit_factor,2));
        ELSIF ARRAY_LENGTH(v_nums,1) >= 2 THEN
            v_result := v_result || jsonb_build_object('width_cm',ROUND(v_nums[1]*v_unit_factor,2),
                'height_cm',ROUND(v_nums[2]*v_unit_factor,2));
        ELSIF ARRAY_LENGTH(v_nums,1) = 1 THEN
            v_result := v_result || jsonb_build_object('width_cm',ROUND(v_nums[1]*v_unit_factor,2));
        END IF;
    END IF;
    RETURN v_result;
END;
$function$
