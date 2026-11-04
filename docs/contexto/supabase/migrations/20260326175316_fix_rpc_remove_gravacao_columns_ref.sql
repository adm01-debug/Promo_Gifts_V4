-- ============================================================================
-- FIX: RPCs referenciando colunas removidas (gravacao_largura_max/gravacao_altura_max)
-- As colunas foram removidas e substituídas por max_width/max_height
-- Mantemos os nomes JSON de saída para compatibilidade com o frontend
-- Data: 2026-03-26
-- ============================================================================

-- 1/2: fn_get_product_customization_options
CREATE OR REPLACE FUNCTION fn_get_product_customization_options(p_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'product_id', p_product_id,
        'locations', COALESCE(jsonb_agg(loc_data ORDER BY loc_order), '[]'::jsonb)
    )
    INTO v_result
    FROM (
        SELECT
            pat.location_code,
            pat.location_name,
            pat.location_order AS loc_order,
            jsonb_build_object(
                'location_code', pat.location_code,
                'location_name', pat.location_name,
                'location_order', pat.location_order,
                'options', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'technique_id', p2.id,
                            'grupo_tecnica', t.grupo_tecnica,
                            'tecnica_nome', t.nome,
                            'variacao_label', t.nome,
                            'codigo_tabela', t.codigo_tabela,
                            'cobra_por_cor', t.cobra_por_cor,
                            'max_cores', COALESCE(t.max_cores, 1),
                            'custo_setup', COALESCE(t.custo_setup, 0),
                            'max_width', p2.max_width,
                            'max_height', p2.max_height,
                            -- Mantém chaves JSON para compatibilidade frontend
                            'gravacao_largura_max', p2.max_width,
                            'gravacao_altura_max', p2.max_height,
                            'is_curved', p2.is_curved,
                            'shape', p2.shape,
                            'usa_dimensao', COALESCE(t.usa_faixa_dimensional, false),
                            'efetiva_largura_max', p2.max_width,
                            'efetiva_altura_max', p2.max_height
                        )
                    ORDER BY t.grupo_tecnica, t.codigo_tabela), '[]'::jsonb)
                    FROM print_area_techniques p2
                    JOIN tabela_preco_gravacao_oficial t ON t.id = p2.tabela_preco_id
                    WHERE p2.product_id = p_product_id
                      AND p2.location_code = pat.location_code
                      AND p2.is_active = true
                      AND t.ativo = true
                )
            ) AS loc_data
        FROM (
            SELECT DISTINCT location_code, location_name, location_order
            FROM print_area_techniques
            WHERE product_id = p_product_id
              AND is_active = true
        ) pat
        ORDER BY pat.location_order
    ) sub;

    RETURN v_result;
END;
$$;

-- 2/2: fn_get_customization_price
CREATE OR REPLACE FUNCTION fn_get_customization_price(
    p_area_id UUID,
    p_quantidade INT,
    p_num_cores INT DEFAULT 1,
    p_largura_cm NUMERIC DEFAULT NULL,
    p_altura_cm NUMERIC DEFAULT NULL,
    p_num_pontos INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tabela_id UUID;
    v_codigo_tabela TEXT;
    v_nome_tabela TEXT;
    v_grupo_tecnica TEXT;
    v_cobra_por_cor BOOLEAN;
    v_max_cores INT;
    v_custo_setup NUMERIC;
    v_custo_setup_por_cor BOOLEAN;
    v_desconto_2cor NUMERIC;
    v_desconto_3cor NUMERIC;
    v_is_curved BOOLEAN;
    v_usa_faixa_dimensional BOOLEAN;
    v_max_width NUMERIC;
    v_max_height NUMERIC;
    v_efetiva_w NUMERIC;
    v_efetiva_h NUMERIC;
    v_preco_base NUMERIC;
    v_custo_unitario NUMERIC;
    v_preco_venda NUMERIC;
    v_setup_total NUMERIC;
    v_valor_gravacao NUMERIC;
    v_total_cobrado NUMERIC;
    v_faixa_id UUID;
    v_faixa_info JSONB;
    v_markup_pct NUMERIC;
    v_preco_min_unit NUMERIC;
BEGIN
    -- VALIDAÇÃO 1: Quantidade > 0
    IF p_quantidade IS NULL OR p_quantidade <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Quantidade deve ser maior que zero',
            'quantidade', p_quantidade
        );
    END IF;

    -- VALIDAÇÃO 2: Dimensões > 0 (quando informadas)
    IF (p_largura_cm IS NOT NULL AND p_largura_cm <= 0) OR
       (p_altura_cm IS NOT NULL AND p_altura_cm <= 0) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Dimensões devem ser maiores que zero',
            'largura', p_largura_cm,
            'altura', p_altura_cm
        );
    END IF;

    -- PASSO 1: Resolver via print_area_techniques (sem gravacao_* columns)
    SELECT pat.tabela_preco_id, pat.is_curved,
           pat.max_width, pat.max_height
    INTO v_tabela_id, v_is_curved,
         v_max_width, v_max_height
    FROM print_area_techniques pat
    WHERE pat.id = p_area_id AND pat.is_active = true;

    IF v_tabela_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Technique não encontrada',
            'technique_id', p_area_id
        );
    END IF;

    -- PASSO 2: Carregar configuração da tabela
    SELECT
        t.codigo_tabela, t.nome, t.grupo_tecnica,
        t.cobra_por_cor, COALESCE(t.max_cores, 1),
        COALESCE(t.custo_setup, 0), COALESCE(t.custo_setup_por_cor, false),
        COALESCE(t.desconto_segunda_cor, 10),
        COALESCE(t.desconto_terceira_cor, 15),
        COALESCE(t.usa_faixa_dimensional, false),
        COALESCE(t.markup_percent, 0),
        COALESCE(t.preco_minimo_unitario, 0)
    INTO
        v_codigo_tabela, v_nome_tabela, v_grupo_tecnica,
        v_cobra_por_cor, v_max_cores,
        v_custo_setup, v_custo_setup_por_cor,
        v_desconto_2cor, v_desconto_3cor,
        v_usa_faixa_dimensional,
        v_markup_pct,
        v_preco_min_unit
    FROM tabela_preco_gravacao_oficial t
    WHERE t.id = v_tabela_id AND t.ativo = true;

    IF v_codigo_tabela IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Tabela de preço inativa ou não encontrada',
            'tabela_id', v_tabela_id
        );
    END IF;

    -- VALIDAÇÃO 3: max_cores
    IF p_num_cores > v_max_cores THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Máximo de %s cor(es) para técnica %s', v_max_cores, v_codigo_tabela),
            'max_cores', v_max_cores,
            'solicitado', p_num_cores,
            'tabela', v_codigo_tabela
        );
    END IF;

    -- VALIDAÇÃO 4: Dimensão obrigatória quando usa_faixa_dimensional
    IF v_usa_faixa_dimensional AND (p_largura_cm IS NULL OR p_altura_cm IS NULL) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Dimensões obrigatórias para técnica %s (usa faixa dimensional)', v_codigo_tabela),
            'tabela', v_codigo_tabela,
            'usa_faixa_dimensional', true
        );
    END IF;

    -- VALIDAÇÃO 5: Dimensão vs limite (agora usa max_width/max_height diretamente)
    IF p_largura_cm IS NOT NULL AND v_max_width IS NOT NULL THEN
        v_efetiva_w := v_max_width;
        IF p_largura_cm > v_efetiva_w THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', format('Largura %s cm excede limite máximo de %s cm', ROUND(p_largura_cm,1), ROUND(v_efetiva_w,1)),
                'largura_solicitada', p_largura_cm,
                'largura_maxima', v_efetiva_w,
                'tabela', v_codigo_tabela
            );
        END IF;
    END IF;

    IF p_altura_cm IS NOT NULL AND v_max_height IS NOT NULL THEN
        v_efetiva_h := v_max_height;
        IF p_altura_cm > v_efetiva_h THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', format('Altura %s cm excede limite máximo de %s cm', ROUND(p_altura_cm,1), ROUND(v_efetiva_h,1)),
                'altura_solicitada', p_altura_cm,
                'altura_maxima', v_efetiva_h,
                'tabela', v_codigo_tabela
            );
        END IF;
    END IF;

    -- PASSO 3: Encontrar faixa de preço
    IF p_largura_cm IS NOT NULL AND p_altura_cm IS NOT NULL THEN
        SELECT f.id, jsonb_build_object(
            'faixa_id', f.id, 'qtd_min', f.quantidade_minima, 'qtd_max', f.quantidade_maxima,
            'larg_min', f.largura_min, 'larg_max', f.largura_max,
            'alt_min', f.altura_min, 'alt_max', f.altura_max, 'preco', f.preco_unitario
        )
        INTO v_faixa_id, v_faixa_info
        FROM tabela_preco_gravacao_oficial_faixa f
        WHERE f.tabela_preco_gravacao_id = v_tabela_id
          AND p_quantidade BETWEEN f.quantidade_minima AND f.quantidade_maxima
          AND f.largura_min IS NOT NULL
          AND p_largura_cm BETWEEN f.largura_min AND f.largura_max
          AND p_altura_cm BETWEEN f.altura_min AND f.altura_max
        ORDER BY f.preco_unitario ASC LIMIT 1;
    END IF;

    IF v_faixa_id IS NULL THEN
        SELECT f.id, jsonb_build_object(
            'faixa_id', f.id, 'qtd_min', f.quantidade_minima, 'qtd_max', f.quantidade_maxima, 'preco', f.preco_unitario
        )
        INTO v_faixa_id, v_faixa_info
        FROM tabela_preco_gravacao_oficial_faixa f
        WHERE f.tabela_preco_gravacao_id = v_tabela_id
          AND p_quantidade BETWEEN f.quantidade_minima AND f.quantidade_maxima
          AND f.largura_min IS NULL
        ORDER BY f.preco_unitario ASC LIMIT 1;
    END IF;

    IF v_faixa_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Nenhuma faixa de preço encontrada',
            'tabela', v_codigo_tabela,
            'quantidade', p_quantidade,
            'largura', p_largura_cm,
            'altura', p_altura_cm
        );
    END IF;

    v_preco_base := (v_faixa_info->>'preco')::NUMERIC;

    -- PASSO 4: Calcular CUSTO unitário com cores
    IF v_cobra_por_cor AND p_num_cores > 1 THEN
        v_custo_unitario := v_preco_base;
        IF p_num_cores >= 2 THEN
            v_custo_unitario := v_custo_unitario + v_preco_base * (1 - v_desconto_2cor / 100.0);
        END IF;
        IF p_num_cores >= 3 THEN
            v_custo_unitario := v_custo_unitario + v_preco_base * (1 - v_desconto_3cor / 100.0);
        END IF;
    ELSE
        v_custo_unitario := v_preco_base;
    END IF;

    -- PASSO 4.5: Aplicar MARKUP
    v_preco_venda := v_custo_unitario * (1 + v_markup_pct / 100.0);
    v_preco_venda := GREATEST(v_preco_venda, v_preco_min_unit);

    -- PASSO 5: Setup
    IF v_custo_setup_por_cor THEN
        v_setup_total := (v_custo_setup * LEAST(p_num_cores, v_max_cores)) * (1 + v_markup_pct / 100.0);
    ELSE
        v_setup_total := v_custo_setup * (1 + v_markup_pct / 100.0);
    END IF;

    -- PASSO 6: Total = MAX(gravação, setup)
    v_valor_gravacao := v_preco_venda * p_quantidade;
    v_total_cobrado := GREATEST(v_valor_gravacao, v_setup_total);

    RETURN jsonb_build_object(
        'success', true,
        'tabela', v_codigo_tabela,
        'nome_tabela', v_nome_tabela,
        'grupo_tecnica', v_grupo_tecnica,
        'faixa', v_faixa_info,
        'preco_unitario', ROUND(v_preco_venda, 4),
        'quantidade', p_quantidade,
        'num_cores', p_num_cores,
        'valor_gravacao', ROUND(v_valor_gravacao, 2),
        'setup_total', ROUND(v_setup_total, 2),
        'total_cobrado', ROUND(v_total_cobrado, 2),
        'preco_por_unidade', ROUND(v_total_cobrado / p_quantidade, 4),
        'detalhes', jsonb_build_object(
            'cobra_por_cor', v_cobra_por_cor,
            'max_cores', v_max_cores,
            'desconto_2cor', v_desconto_2cor,
            'desconto_3cor', v_desconto_3cor,
            'is_curved', v_is_curved
        ),
        'markup', jsonb_build_object(
            'markup_pct', v_markup_pct,
            'preco_min_unit', v_preco_min_unit,
            'custo_unitario', ROUND(v_custo_unitario, 4),
            'custo_setup_tabela', v_custo_setup
        )
    );
END;
$$;
