CREATE OR REPLACE FUNCTION public.get_sale_price(p_variant_id uuid, p_quantity integer DEFAULT 1)
 RETURNS TABLE(variant_id uuid, quantity integer, cost_price numeric, markup_percent numeric, sale_price numeric, tier_used integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_cost DECIMAL(10,4);
    v_markup DECIMAL(5,2);
    v_tier INT;
BEGIN
    -- Buscar custo da faixa apropriada
    SELECT 
        CASE 
            WHEN p_quantity >= COALESCE(pv.min_qty_5, 999999) AND pv.price_5 IS NOT NULL THEN pv.price_5
            WHEN p_quantity >= COALESCE(pv.min_qty_4, 999999) AND pv.price_4 IS NOT NULL THEN pv.price_4
            WHEN p_quantity >= COALESCE(pv.min_qty_3, 999999) AND pv.price_3 IS NOT NULL THEN pv.price_3
            WHEN p_quantity >= COALESCE(pv.min_qty_2, 999999) AND pv.price_2 IS NOT NULL THEN pv.price_2
            ELSE pv.price_1
        END,
        CASE 
            WHEN p_quantity >= COALESCE(pv.min_qty_5, 999999) AND pv.price_5 IS NOT NULL THEN 5
            WHEN p_quantity >= COALESCE(pv.min_qty_4, 999999) AND pv.price_4 IS NOT NULL THEN 4
            WHEN p_quantity >= COALESCE(pv.min_qty_3, 999999) AND pv.price_3 IS NOT NULL THEN 3
            WHEN p_quantity >= COALESCE(pv.min_qty_2, 999999) AND pv.price_2 IS NOT NULL THEN 2
            ELSE 1
        END
    INTO v_cost, v_tier
    FROM product_variants pv
    WHERE pv.id = p_variant_id;
    
    -- Se não encontrou variante, retorna NULL
    IF v_cost IS NULL THEN
        RETURN;
    END IF;
    
    -- Buscar markup aplicável
    v_markup := get_applicable_markup(p_variant_id);
    
    -- Retornar resultado
    RETURN QUERY SELECT 
        p_variant_id,
        p_quantity,
        v_cost,
        v_markup,
        ROUND(v_cost * (1 + v_markup / 100), 2)::DECIMAL(10,2),
        v_tier;
END;
$function$
