CREATE OR REPLACE FUNCTION public.get_variant_price(p_variant_id uuid, p_quantity integer DEFAULT 1)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_price numeric;
BEGIN
  -- Melhor tier por quantidade, derivado das colunas de VSS (cost_price_1..5 / min_qty_1..5).
  SELECT t.cost_price INTO v_price
  FROM variant_supplier_sources vss
  CROSS JOIN LATERAL (VALUES
      (vss.min_qty_1, vss.cost_price_1),
      (vss.min_qty_2, vss.cost_price_2),
      (vss.min_qty_3, vss.cost_price_3),
      (vss.min_qty_4, vss.cost_price_4),
      (vss.min_qty_5, vss.cost_price_5)
  ) AS t(min_qty, cost_price)
  WHERE vss.variant_id = p_variant_id
    AND vss.is_active = true
    AND t.cost_price IS NOT NULL
    AND t.min_qty IS NOT NULL
    AND t.min_qty <= p_quantity
  ORDER BY t.min_qty DESC, t.cost_price ASC
  LIMIT 1;

  -- Fallback: cost_price do VSS preferido.
  IF v_price IS NULL THEN
    SELECT vss.cost_price INTO v_price
    FROM variant_supplier_sources vss
    WHERE vss.variant_id = p_variant_id AND vss.is_active = true
    ORDER BY vss.is_preferred DESC, vss.priority ASC NULLS LAST
    LIMIT 1;
  END IF;

  RETURN COALESCE(v_price, 0);
END;
$function$
