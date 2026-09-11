-- ============================================================
-- MELHORIA 4A: get_variant_price passa a derivar os tiers de
-- variant_supplier_sources (fonte VIVA, atualizada pelo pipeline),
-- em vez de supplier_price_tiers (snapshot congelado em 2026-06-13).
--
-- Motivo: a tabela supplier_price_tiers não é escrita desde 13/06;
-- get_variant_price a lia PRIMEIRO, servindo preços stale em 639/3600
-- amostras testadas. Dry-run provou: 2.961 idênticas (lógica fiel) e
-- 639 corrigidas para o valor VSS atual.
--
-- Semântica preservada: melhor tier = maior min_qty_n <= quantidade;
-- fallback = cost_price do VSS preferido. Desempate determinístico
-- adicionado (min_qty DESC, cost_price ASC).
-- ============================================================
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
$function$;;
