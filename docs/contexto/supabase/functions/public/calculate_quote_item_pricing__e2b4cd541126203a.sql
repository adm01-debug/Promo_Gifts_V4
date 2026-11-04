CREATE OR REPLACE FUNCTION public.calculate_quote_item_pricing(p_variant_id uuid, p_quantity integer, p_organization_id uuid)
 RETURNS TABLE(unit_cost numeric, unit_price numeric, total_cost numeric, total_price numeric, margin_percent numeric, total_profit numeric, cost_tier integer, price_tier integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_cost DECIMAL(10,4);
    v_price DECIMAL(10,2);
    v_cost_tier INT;
    v_price_tier INT;
BEGIN
    SELECT gcfq.cost_per_unit, gcfq.tier_number 
    INTO v_cost, v_cost_tier
    FROM get_cost_for_quantity(p_variant_id, p_quantity) gcfq;
    
    SELECT gspfq.price_per_unit, gspfq.tier_number
    INTO v_price, v_price_tier
    FROM get_sale_price_for_quantity(p_variant_id, p_quantity, p_organization_id) gspfq;
    
    RETURN QUERY
    SELECT 
        COALESCE(v_cost, 0::DECIMAL(10,4)) AS unit_cost,
        COALESCE(v_price, 0::DECIMAL(10,2)) AS unit_price,
        ROUND(COALESCE(v_cost, 0) * p_quantity, 2)::DECIMAL(12,2) AS total_cost,
        ROUND(COALESCE(v_price, 0) * p_quantity, 2)::DECIMAL(12,2) AS total_price,
        CASE 
            WHEN v_cost > 0 THEN ROUND(((v_price - v_cost) / v_cost) * 100, 2)
            ELSE 0::DECIMAL(8,2)
        END AS margin_percent,
        ROUND((COALESCE(v_price, 0) - COALESCE(v_cost, 0)) * p_quantity, 2)::DECIMAL(12,2) AS total_profit,
        COALESCE(v_cost_tier, 1) AS cost_tier,
        COALESCE(v_price_tier, 1) AS price_tier;
END;
$function$
