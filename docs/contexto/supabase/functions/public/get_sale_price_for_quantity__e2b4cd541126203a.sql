CREATE OR REPLACE FUNCTION public.get_sale_price_for_quantity(p_variant_id uuid, p_quantity integer, p_organization_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(price_per_unit numeric, tier_number integer, min_quantity integer, is_manual_price boolean)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN p_quantity >= COALESCE(vsp.min_qty_5, 999999) AND vsp.price_5 IS NOT NULL THEN vsp.price_5
            WHEN p_quantity >= COALESCE(vsp.min_qty_4, 999999) AND vsp.price_4 IS NOT NULL THEN vsp.price_4
            WHEN p_quantity >= COALESCE(vsp.min_qty_3, 999999) AND vsp.price_3 IS NOT NULL THEN vsp.price_3
            WHEN p_quantity >= COALESCE(vsp.min_qty_2, 999999) AND vsp.price_2 IS NOT NULL THEN vsp.price_2
            ELSE vsp.price_1
        END AS price_per_unit,
        CASE 
            WHEN p_quantity >= COALESCE(vsp.min_qty_5, 999999) AND vsp.price_5 IS NOT NULL THEN 5
            WHEN p_quantity >= COALESCE(vsp.min_qty_4, 999999) AND vsp.price_4 IS NOT NULL THEN 4
            WHEN p_quantity >= COALESCE(vsp.min_qty_3, 999999) AND vsp.price_3 IS NOT NULL THEN 3
            WHEN p_quantity >= COALESCE(vsp.min_qty_2, 999999) AND vsp.price_2 IS NOT NULL THEN 2
            ELSE 1
        END AS tier_number,
        CASE 
            WHEN p_quantity >= COALESCE(vsp.min_qty_5, 999999) AND vsp.price_5 IS NOT NULL THEN vsp.min_qty_5
            WHEN p_quantity >= COALESCE(vsp.min_qty_4, 999999) AND vsp.price_4 IS NOT NULL THEN vsp.min_qty_4
            WHEN p_quantity >= COALESCE(vsp.min_qty_3, 999999) AND vsp.price_3 IS NOT NULL THEN vsp.min_qty_3
            WHEN p_quantity >= COALESCE(vsp.min_qty_2, 999999) AND vsp.price_2 IS NOT NULL THEN vsp.min_qty_2
            ELSE vsp.min_qty_1
        END AS min_quantity,
        CASE 
            WHEN p_quantity >= COALESCE(vsp.min_qty_5, 999999) AND vsp.price_5 IS NOT NULL THEN vsp.is_price_5_manual
            WHEN p_quantity >= COALESCE(vsp.min_qty_4, 999999) AND vsp.price_4 IS NOT NULL THEN vsp.is_price_4_manual
            WHEN p_quantity >= COALESCE(vsp.min_qty_3, 999999) AND vsp.price_3 IS NOT NULL THEN vsp.is_price_3_manual
            WHEN p_quantity >= COALESCE(vsp.min_qty_2, 999999) AND vsp.price_2 IS NOT NULL THEN vsp.is_price_2_manual
            ELSE vsp.is_price_1_manual
        END AS is_manual_price
    FROM variant_sale_prices vsp
    WHERE vsp.variant_id = p_variant_id
      AND vsp.is_active = true
      AND (p_organization_id IS NULL OR vsp.organization_id = p_organization_id)
    LIMIT 1;
END;
$function$
