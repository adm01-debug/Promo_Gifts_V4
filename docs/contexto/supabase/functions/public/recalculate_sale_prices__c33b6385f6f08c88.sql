CREATE OR REPLACE FUNCTION public.recalculate_sale_prices(p_variant_id uuid DEFAULT NULL::uuid, p_organization_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_count INT := 0;
    r RECORD;
BEGIN
    FOR r IN 
        SELECT 
            vsp.id AS sale_id,
            vsp.variant_id,
            vsp.default_markup_percent,
            vct.cost_1, vct.cost_2, vct.cost_3, vct.cost_4, vct.cost_5,
            vct.min_qty_1, vct.min_qty_2, vct.min_qty_3, vct.min_qty_4, vct.min_qty_5,
            vsp.is_price_1_manual, vsp.is_price_2_manual, vsp.is_price_3_manual, 
            vsp.is_price_4_manual, vsp.is_price_5_manual
        FROM variant_sale_prices vsp
        JOIN variant_cost_tiers vct ON vct.variant_id = vsp.variant_id AND vct.is_active = true
        WHERE (p_variant_id IS NULL OR vsp.variant_id = p_variant_id)
          AND (p_organization_id IS NULL OR vsp.organization_id = p_organization_id)
          AND vsp.is_active = true
    LOOP
        UPDATE variant_sale_prices
        SET 
            price_1 = CASE WHEN NOT r.is_price_1_manual THEN ROUND(r.cost_1 * (1 + r.default_markup_percent/100), 2) ELSE price_1 END,
            price_2 = CASE WHEN NOT r.is_price_2_manual AND r.cost_2 IS NOT NULL THEN ROUND(r.cost_2 * (1 + r.default_markup_percent/100), 2) ELSE price_2 END,
            price_3 = CASE WHEN NOT r.is_price_3_manual AND r.cost_3 IS NOT NULL THEN ROUND(r.cost_3 * (1 + r.default_markup_percent/100), 2) ELSE price_3 END,
            price_4 = CASE WHEN NOT r.is_price_4_manual AND r.cost_4 IS NOT NULL THEN ROUND(r.cost_4 * (1 + r.default_markup_percent/100), 2) ELSE price_4 END,
            price_5 = CASE WHEN NOT r.is_price_5_manual AND r.cost_5 IS NOT NULL THEN ROUND(r.cost_5 * (1 + r.default_markup_percent/100), 2) ELSE price_5 END,
            min_qty_1 = r.min_qty_1,
            min_qty_2 = r.min_qty_2,
            min_qty_3 = r.min_qty_3,
            min_qty_4 = r.min_qty_4,
            min_qty_5 = r.min_qty_5,
            last_calculated_at = NOW(),
            updated_at = NOW()
        WHERE id = r.sale_id;
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$function$
