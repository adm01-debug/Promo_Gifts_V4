
-- FIX 1: get_inventory_health contava variantes INATIVAS com estoque obsoleto
-- nos KPIs with_stock / low_stock. Adiciona filtro pv.is_active = true
-- (a parte total_value/total_units já filtrava). 
CREATE OR REPLACE FUNCTION public.get_inventory_health()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_products  INTEGER;
  v_with_stock      INTEGER;
  v_low_stock       INTEGER;
  v_no_stock        INTEGER;
  v_total_value     NUMERIC;
  v_total_units     BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total_products
  FROM products WHERE is_active = true AND deleted_at IS NULL;

  SELECT COUNT(DISTINCT p.id) INTO v_with_stock
  FROM products p
  JOIN product_variants pv ON pv.product_id = p.id
  WHERE p.is_active = true AND p.deleted_at IS NULL
    AND pv.is_active = true          -- FIX: ignora variantes inativas
    AND pv.stock_quantity > 0;

  SELECT COUNT(DISTINCT p.id) INTO v_low_stock
  FROM products p
  JOIN product_variants pv ON pv.product_id = p.id
  WHERE p.is_active = true AND p.deleted_at IS NULL
    AND pv.is_active = true          -- FIX: ignora variantes inativas
    AND pv.stock_quantity > 0 AND pv.stock_quantity < 10;

  v_no_stock := v_total_products - v_with_stock;

  SELECT
    COALESCE(SUM(vss.quantity::bigint * COALESCE(vss.cost_price, 0)), 0),
    COALESCE(SUM(vss.quantity::bigint), 0)
  INTO v_total_value, v_total_units
  FROM product_variants pv
  JOIN products p          ON p.id = pv.product_id
  JOIN variant_supplier_sources vss ON vss.variant_id = pv.id AND vss.is_active = true
  WHERE p.is_active = true AND p.deleted_at IS NULL AND pv.is_active = true;

  RETURN json_build_object(
    'summary', json_build_object(
      'total_products',    v_total_products,
      'with_stock',        v_with_stock,
      'with_stock_pct',    ROUND((v_with_stock::NUMERIC / NULLIF(v_total_products,0) * 100), 1),
      'low_stock',         v_low_stock,
      'no_stock',          v_no_stock,
      'no_stock_pct',      ROUND((v_no_stock::NUMERIC / NULLIF(v_total_products,0) * 100), 1)
    ),
    'inventory', json_build_object(
      'total_units',  v_total_units,
      'total_value',  ROUND(v_total_value, 2),
      'currency',     'BRL',
      'note',         'Valor calculado via VSS cost_price (custo líquido fornecedor)'
    ),
    'alerts', json_build_object(
      'critical_low_stock', v_low_stock,
      'out_of_stock',       v_no_stock
    ),
    'generated_at', NOW()
  );
END;
$function$;

-- FIX 2 (durável): ao DESATIVAR uma variante, zera seu cache stock_quantity
-- (variante inativa = 0 vendável). Fecha o leak D na origem, sem UPDATE extra.
CREATE OR REPLACE FUNCTION public.fn_zero_stock_on_variant_deactivate()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = false THEN
    NEW.stock_quantity := 0;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_zero_stock_on_variant_deactivate ON public.product_variants;
CREATE TRIGGER trg_zero_stock_on_variant_deactivate
  BEFORE UPDATE OF is_active ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.fn_zero_stock_on_variant_deactivate();
;
