CREATE OR REPLACE FUNCTION public.fn_validate_print_area_dimensions(p_area_id uuid, p_largura numeric DEFAULT NULL::numeric, p_altura numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_area RECORD;
    v_errors JSONB := '[]'::JSONB;
    v_tabela_codigo TEXT;
    v_tabela_nome TEXT;
    v_limit_width  NUMERIC;
    v_limit_height NUMERIC;
BEGIN
    -- 1. BUSCAR ÁREA E SEUS LIMITES
    SELECT 
        pat.id,
        pat.location_code,
        pat.location_name,
        pat.max_width,
        pat.max_height,
        pat.gravacao_largura_max,
        pat.gravacao_altura_max,
        tpgo.codigo_tabela,
        tpgo.nome,
        tpgo.usa_faixa_dimensional
    INTO v_area
    FROM print_area_techniques pat
    LEFT JOIN tabela_preco_gravacao_oficial tpgo 
        ON tpgo.id = pat.tabela_preco_id
    WHERE pat.id = p_area_id;

    IF v_area IS NULL THEN
        RETURN jsonb_build_object(
            'valid', false,
            'area_id', p_area_id,
            'error', 'Área de gravação não encontrada',
            'error_code', 'AREA_NOT_FOUND'
        );
    END IF;

    v_tabela_codigo := COALESCE(v_area.codigo_tabela, 'N/A');
    v_tabela_nome := COALESCE(v_area.nome, 'N/A');

    -- 2. LIMITES EFETIVOS
    v_limit_width  := COALESCE(v_area.gravacao_largura_max, v_area.max_width);
    v_limit_height := COALESCE(v_area.gravacao_altura_max, v_area.max_height);

    -- 3. VALIDAR LARGURA
    IF p_largura IS NOT NULL THEN
        IF p_largura <= 0 THEN
            v_errors := v_errors || jsonb_build_object(
                'field', 'largura',
                'code', 'INVALID_VALUE',
                'message', 'Largura deve ser maior que zero',
                'value', p_largura
            );
        ELSIF p_largura > v_limit_width THEN
            v_errors := v_errors || jsonb_build_object(
                'field', 'largura',
                'code', 'EXCEEDS_MAX_WIDTH',
                'message', 'Largura ' || round(p_largura, 1) || 'cm excede o máximo de ' || round(v_limit_width, 1) || 'cm para ' || v_area.location_name || ' (' || v_tabela_nome || ')',
                'value', p_largura,
                'max_allowed', v_limit_width
            );
        END IF;
    END IF;

    -- 4. VALIDAR ALTURA
    IF p_altura IS NOT NULL THEN
        IF p_altura <= 0 THEN
            v_errors := v_errors || jsonb_build_object(
                'field', 'altura',
                'code', 'INVALID_VALUE',
                'message', 'Altura deve ser maior que zero',
                'value', p_altura
            );
        ELSIF p_altura > v_limit_height THEN
            v_errors := v_errors || jsonb_build_object(
                'field', 'altura',
                'code', 'EXCEEDS_MAX_HEIGHT',
                'message', 'Altura ' || round(p_altura, 1) || 'cm excede o máximo de ' || round(v_limit_height, 1) || 'cm para ' || v_area.location_name || ' (' || v_tabela_nome || ')',
                'value', p_altura,
                'max_allowed', v_limit_height
            );
        END IF;
    END IF;

    -- 5. RETORNAR RESULTADO
    RETURN jsonb_build_object(
        'valid', (jsonb_array_length(v_errors) = 0),
        'area_id', p_area_id,
        'location', v_area.location_code,
        'location_name', v_area.location_name,
        'tabela', v_tabela_codigo,
        'tabela_nome', v_tabela_nome,
        'usa_faixa_dimensional', COALESCE(v_area.usa_faixa_dimensional, false),
        'limits', jsonb_build_object(
            'max_width', v_limit_width,
            'max_height', v_limit_height
        ),
        'requested', jsonb_build_object(
            'largura', p_largura,
            'altura', p_altura
        ),
        'errors', v_errors
    );
END;
$function$
