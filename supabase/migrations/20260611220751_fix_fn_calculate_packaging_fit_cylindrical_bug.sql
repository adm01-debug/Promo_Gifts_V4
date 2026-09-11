
CREATE OR REPLACE FUNCTION public.fn_calculate_packaging_fit(
    p_product_id   uuid,
    p_packaging_id uuid,
    p_config_type  text DEFAULT 'default'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
    v_product   RECORD;
    v_packaging RECORD;
    v_gap_h     DECIMAL; v_gap_w DECIMAL; v_gap_l DECIMAL; v_gap_d DECIMAL;
    v_gap_min   DECIMAL; v_gap_avg DECIMAL;
    v_rating    VARCHAR(20);
    v_prefix    TEXT;
    v_min       DECIMAL := 2;
    v_tight     DECIMAL := 5;
    v_good      DECIMAL := 15;
    v_max       DECIMAL := 50;
    -- Para cilíndrico × retangular: orientação ótima
    v_pkg_dims  DECIMAL[];
    v_pkg_long  DECIMAL;  -- maior dim interna (para a altura do cilindro)
    v_pkg_short DECIMAL;  -- menor dim interna (para o diâmetro do cilindro)
    v_pkg_mid   DECIMAL;  -- dim do meio (também para diâmetro)
BEGIN
    -- Determinar prefixo de configuração
    v_prefix := lower(trim(COALESCE(p_config_type, 'default')));
    IF v_prefix NOT IN ('fragile','precision','bottles') THEN v_prefix := ''; END IF;
    IF v_prefix <> '' THEN v_prefix := v_prefix || '_'; END IF;

    -- Carregar limites (com fallback para default)
    SELECT COALESCE(
        (SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key = v_prefix || 'min_gap_mm'),
        (SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key = 'min_gap_mm'), 2
    ) INTO v_min;
    SELECT COALESCE(
        (SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key = v_prefix || 'tight_max_mm'),
        (SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key = 'tight_gap_max_mm'), 5
    ) INTO v_tight;
    SELECT COALESCE(
        (SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key = v_prefix || 'good_max_mm'),
        (SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key = 'good_gap_max_mm'), 15
    ) INTO v_good;
    SELECT COALESCE(
        (SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key = v_prefix || 'max_gap_mm'),
        (SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key = 'max_gap_mm'), 50
    ) INTO v_max;

    -- Buscar produto
    SELECT height_cm, width_cm, length_cm, diameter_cm, shape_type
    INTO v_product FROM products WHERE id = p_product_id;
    IF v_product IS NULL THEN
        RETURN jsonb_build_object('error','Produto não encontrado','compatible',false);
    END IF;

    -- Buscar embalagem
    SELECT internal_height_cm, internal_width_cm, internal_length_cm, internal_diameter_cm, product_type
    INTO v_packaging FROM products WHERE id = p_packaging_id;
    IF v_packaging IS NULL OR v_packaging.product_type <> 'packaging' THEN
        RETURN jsonb_build_object('error','Embalagem não encontrada ou inválida','compatible',false);
    END IF;

    -- Calcular folgas
    IF v_product.shape_type = 'cylindrical' THEN
        -- Produto cilíndrico: pode ser orientado na maior dimensão da caixa
        IF v_packaging.internal_diameter_cm IS NOT NULL THEN
            -- Embalagem também cilíndrica: comparação direta
            v_gap_d := (v_packaging.internal_diameter_cm - COALESCE(v_product.diameter_cm, v_product.width_cm)) * 10;
            v_gap_h := (v_packaging.internal_height_cm  - v_product.height_cm) * 10;
        ELSE
            -- Embalagem retangular: orientar cilindro na maior dimensão disponível
            -- Ordenar dimensões internas: menor para diâmetro, maior para comprimento
            v_pkg_dims := ARRAY[
                COALESCE(v_packaging.internal_height_cm, 0),
                COALESCE(v_packaging.internal_width_cm,  0),
                COALESCE(v_packaging.internal_length_cm, 0)
            ];
            -- v_pkg_long = maior dimensão (comporta a altura do cilindro)
            v_pkg_long  := GREATEST(v_pkg_dims[1], v_pkg_dims[2], v_pkg_dims[3]);
            -- v_pkg_short = menor dimensão (limita o diâmetro)
            v_pkg_short := LEAST(v_pkg_dims[1], v_pkg_dims[2], v_pkg_dims[3]);
            -- v_pkg_mid = dimensão do meio (também limita o diâmetro)
            v_pkg_mid   := v_pkg_dims[1] + v_pkg_dims[2] + v_pkg_dims[3]
                           - v_pkg_long - v_pkg_short;

            v_gap_h := (v_pkg_long  - v_product.height_cm) * 10;
            v_gap_d := (v_pkg_short - COALESCE(v_product.diameter_cm, v_product.width_cm)) * 10;
            -- Verificar se também cabe na dimensão do meio
            IF v_pkg_mid < COALESCE(v_product.diameter_cm, v_product.width_cm) THEN
                v_gap_d := LEAST(v_gap_d, (v_pkg_mid - COALESCE(v_product.diameter_cm, v_product.width_cm)) * 10);
            END IF;
        END IF;
        v_gap_min := LEAST(COALESCE(v_gap_d, 999), COALESCE(v_gap_h, 999));
        v_gap_avg := (COALESCE(v_gap_d, 0) + COALESCE(v_gap_h, 0)) / 2.0;
    ELSE
        -- Produto retangular: alinhamento direto por dimensão
        v_gap_h   := (v_packaging.internal_height_cm - v_product.height_cm) * 10;
        v_gap_w   := (v_packaging.internal_width_cm  - v_product.width_cm ) * 10;
        v_gap_l   := (v_packaging.internal_length_cm - v_product.length_cm) * 10;
        v_gap_min := LEAST(COALESCE(v_gap_h, 999), COALESCE(v_gap_w, 999), COALESCE(v_gap_l, 999));
        v_gap_avg := (COALESCE(v_gap_h, 0) + COALESCE(v_gap_w, 0) + COALESCE(v_gap_l, 0)) / 3.0;
    END IF;

    -- Classificar encaixe
    IF v_gap_min IS NULL OR v_gap_min >= 900 THEN
        v_rating := 'incompatible';
    ELSIF v_gap_min < 0 THEN
        v_rating := 'too_tight';
    ELSIF v_gap_min < v_min  THEN
        v_rating := 'too_tight';
    ELSIF v_gap_min <= v_tight THEN
        v_rating := 'tight';
    ELSIF v_gap_min <= v_good  THEN
        v_rating := 'good';
    ELSIF v_gap_min <= v_max   THEN
        v_rating := 'loose';
    ELSE
        v_rating := 'too_large';
    END IF;

    RETURN jsonb_build_object(
        'compatible',      v_rating IN ('tight','good','loose'),
        'fit_rating',      v_rating,
        'config_type',     COALESCE(NULLIF(p_config_type,'default'), 'default'),
        'gap_height_mm',   ROUND(COALESCE(v_gap_h, 0)::numeric, 2),
        'gap_width_mm',    ROUND(COALESCE(v_gap_w, 0)::numeric, 2),
        'gap_length_mm',   ROUND(COALESCE(v_gap_l, 0)::numeric, 2),
        'gap_diameter_mm', ROUND(COALESCE(v_gap_d, 0)::numeric, 2),
        'gap_min_mm',      CASE WHEN v_gap_min < 900 THEN ROUND(v_gap_min::numeric, 2) ELSE NULL END,
        'gap_avg_mm',      ROUND(v_gap_avg::numeric, 2),
        'shape',           v_product.shape_type,
        'limits_mm',       jsonb_build_object('min',v_min,'tight',v_tight,'good',v_good,'max',v_max)
    );
END;
$function$;

COMMENT ON FUNCTION public.fn_calculate_packaging_fit(uuid, uuid, text) IS
'Calcula compatibilidade dimensional produto×embalagem com suporte a orientação ótima.
Cilíndrico×retangular: produto é orientado na maior dimensão da caixa (fix v2).
p_config_type: default | fragile | precision | bottles.
fit_rating: tight|good|loose|too_tight|too_large|incompatible.';
;
