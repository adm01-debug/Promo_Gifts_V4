CREATE OR REPLACE FUNCTION public.fn_calculate_sale_price(p_product_id uuid, p_quantity integer DEFAULT 1, p_price_list_id uuid DEFAULT NULL::uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_cost_price NUMERIC;
    v_fallback_cost NUMERIC;
    v_markup_percent NUMERIC;
    v_supplier_id UUID;
    v_category_id UUID;
BEGIN
    SELECT cost_price, category_id INTO v_fallback_cost, v_category_id
    FROM products WHERE id = p_product_id;
    
    IF v_fallback_cost IS NULL OR v_fallback_cost = 0 THEN RETURN NULL; END IF;
    
    SELECT 
        CASE 
            WHEN p_quantity >= COALESCE(vss.min_qty_5, 999999) AND vss.cost_price_5 IS NOT NULL THEN vss.cost_price_5
            WHEN p_quantity >= COALESCE(vss.min_qty_4, 999999) AND vss.cost_price_4 IS NOT NULL THEN vss.cost_price_4
            WHEN p_quantity >= COALESCE(vss.min_qty_3, 999999) AND vss.cost_price_3 IS NOT NULL THEN vss.cost_price_3
            WHEN p_quantity >= COALESCE(vss.min_qty_2, 999999) AND vss.cost_price_2 IS NOT NULL THEN vss.cost_price_2
            WHEN vss.cost_price_1 IS NOT NULL THEN vss.cost_price_1
            ELSE vss.cost_price
        END,
        vss.supplier_id
    INTO v_cost_price, v_supplier_id
    FROM product_variants pv
    JOIN variant_supplier_sources vss ON vss.variant_id = pv.id AND vss.is_preferred = true
    WHERE pv.product_id = p_product_id
    LIMIT 1;
    
    v_cost_price := COALESCE(v_cost_price, v_fallback_cost);
    
    SELECT markup_percent INTO v_markup_percent
    FROM markup_configurations
    WHERE category_id = v_category_id AND product_id IS NULL AND variant_id IS NULL AND is_active = true
    LIMIT 1;
    
    IF v_markup_percent IS NULL AND v_supplier_id IS NOT NULL THEN
        SELECT default_markup_percent INTO v_markup_percent
        FROM suppliers WHERE id = v_supplier_id;
    END IF;
    
    IF v_markup_percent IS NULL THEN
        SELECT markup_percent INTO v_markup_percent
        FROM markup_configurations
        WHERE category_id IS NULL AND product_id IS NULL AND variant_id IS NULL AND is_active = true
        ORDER BY priority DESC LIMIT 1;
    END IF;
    
    v_markup_percent := COALESCE(v_markup_percent, 115.0);
    
    RETURN ROUND(v_cost_price * (1 + v_markup_percent / 100), 2);
END;
$function$
