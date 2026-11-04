CREATE OR REPLACE FUNCTION public.get_cost_for_quantity(p_variant_id uuid, p_quantity integer, p_supplier_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(cost_per_unit numeric, tier_number integer, min_quantity integer, supplier_name character varying)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN p_quantity >= COALESCE(vct.min_qty_5, 999999) AND vct.cost_5 IS NOT NULL THEN vct.cost_5
            WHEN p_quantity >= COALESCE(vct.min_qty_4, 999999) AND vct.cost_4 IS NOT NULL THEN vct.cost_4
            WHEN p_quantity >= COALESCE(vct.min_qty_3, 999999) AND vct.cost_3 IS NOT NULL THEN vct.cost_3
            WHEN p_quantity >= COALESCE(vct.min_qty_2, 999999) AND vct.cost_2 IS NOT NULL THEN vct.cost_2
            ELSE vct.cost_1
        END AS cost_per_unit,
        CASE 
            WHEN p_quantity >= COALESCE(vct.min_qty_5, 999999) AND vct.cost_5 IS NOT NULL THEN 5
            WHEN p_quantity >= COALESCE(vct.min_qty_4, 999999) AND vct.cost_4 IS NOT NULL THEN 4
            WHEN p_quantity >= COALESCE(vct.min_qty_3, 999999) AND vct.cost_3 IS NOT NULL THEN 3
            WHEN p_quantity >= COALESCE(vct.min_qty_2, 999999) AND vct.cost_2 IS NOT NULL THEN 2
            ELSE 1
        END AS tier_number,
        CASE 
            WHEN p_quantity >= COALESCE(vct.min_qty_5, 999999) AND vct.cost_5 IS NOT NULL THEN vct.min_qty_5
            WHEN p_quantity >= COALESCE(vct.min_qty_4, 999999) AND vct.cost_4 IS NOT NULL THEN vct.min_qty_4
            WHEN p_quantity >= COALESCE(vct.min_qty_3, 999999) AND vct.cost_3 IS NOT NULL THEN vct.min_qty_3
            WHEN p_quantity >= COALESCE(vct.min_qty_2, 999999) AND vct.cost_2 IS NOT NULL THEN vct.min_qty_2
            ELSE vct.min_qty_1
        END AS min_quantity,
        s.name AS supplier_name
    FROM variant_cost_tiers vct
    JOIN suppliers s ON s.id = vct.supplier_id
    WHERE vct.variant_id = p_variant_id
      AND vct.is_active = true
      AND CURRENT_DATE >= vct.valid_from
      AND (vct.valid_until IS NULL OR CURRENT_DATE <= vct.valid_until)
      AND (p_supplier_id IS NULL OR vct.supplier_id = p_supplier_id)
    ORDER BY vct.cost_1 ASC
    LIMIT 1;
END;
$function$
