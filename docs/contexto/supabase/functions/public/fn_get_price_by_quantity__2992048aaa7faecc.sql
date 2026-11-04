CREATE OR REPLACE FUNCTION public.fn_get_price_by_quantity(p_variant_id uuid, p_quantity integer DEFAULT 1, p_price_list_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_cost NUMERIC;
    v_markup NUMERIC := 115.0;
    v_tier INTEGER := 1;
    v_result JSONB;
    v_vss RECORD;
BEGIN
    -- Buscar dados da variante
    SELECT 
        vss.*,
        s.default_markup_percent
    INTO v_vss
    FROM variant_supplier_sources vss
    LEFT JOIN suppliers s ON s.id = vss.supplier_id
    WHERE vss.variant_id = p_variant_id
      AND vss.is_preferred = true
    LIMIT 1;
    
    IF v_vss IS NULL THEN
        RETURN jsonb_build_object('error', 'Variante não encontrada');
    END IF;
    
    -- Determinar faixa e custo
    IF p_quantity >= COALESCE(v_vss.min_qty_5, 999999) AND v_vss.cost_price_5 IS NOT NULL THEN
        v_cost := v_vss.cost_price_5;
        v_tier := 5;
    ELSIF p_quantity >= COALESCE(v_vss.min_qty_4, 999999) AND v_vss.cost_price_4 IS NOT NULL THEN
        v_cost := v_vss.cost_price_4;
        v_tier := 4;
    ELSIF p_quantity >= COALESCE(v_vss.min_qty_3, 999999) AND v_vss.cost_price_3 IS NOT NULL THEN
        v_cost := v_vss.cost_price_3;
        v_tier := 3;
    ELSIF p_quantity >= COALESCE(v_vss.min_qty_2, 999999) AND v_vss.cost_price_2 IS NOT NULL THEN
        v_cost := v_vss.cost_price_2;
        v_tier := 2;
    ELSE
        v_cost := COALESCE(v_vss.cost_price_1, v_vss.cost_price);
        v_tier := 1;
    END IF;
    
    -- Obter markup
    IF p_price_list_id IS NOT NULL THEN
        SELECT base_markup_percent INTO v_markup
        FROM price_lists WHERE id = p_price_list_id;
    ELSE
        v_markup := COALESCE(v_vss.default_markup_percent, 115.0);
    END IF;
    
    -- Retornar resultado
    RETURN jsonb_build_object(
        'variant_id', p_variant_id,
        'quantity', p_quantity,
        'tier', v_tier,
        'cost_price', v_cost,
        'markup_percent', v_markup,
        'sale_price', ROUND(v_cost * (1 + v_markup / 100), 2),
        'unit_price', ROUND(v_cost * (1 + v_markup / 100), 2),
        'total_price', ROUND(v_cost * (1 + v_markup / 100) * p_quantity, 2),
        'price_tiers', jsonb_build_object(
            'tier_1', jsonb_build_object('min_qty', COALESCE(v_vss.min_qty_1, 1), 'cost', v_vss.cost_price_1),
            'tier_2', jsonb_build_object('min_qty', v_vss.min_qty_2, 'cost', v_vss.cost_price_2),
            'tier_3', jsonb_build_object('min_qty', v_vss.min_qty_3, 'cost', v_vss.cost_price_3),
            'tier_4', jsonb_build_object('min_qty', v_vss.min_qty_4, 'cost', v_vss.cost_price_4),
            'tier_5', jsonb_build_object('min_qty', v_vss.min_qty_5, 'cost', v_vss.cost_price_5)
        )
    );
END;
$function$
