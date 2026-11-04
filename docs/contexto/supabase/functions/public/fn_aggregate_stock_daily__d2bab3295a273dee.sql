CREATE OR REPLACE FUNCTION public.fn_aggregate_stock_daily(p_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET work_mem TO '64MB'
AS $function$
DECLARE
  v_upserted integer;
  v_purged   integer;
  v_baseline integer;
  v_today    date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;  -- "hoje" BR
BEGIN
  p_date := COALESCE(p_date, v_today);

  IF p_date > v_today THEN
    RAISE EXCEPTION 'fn_aggregate_stock_daily: data futura bloqueada (p_date=%, hoje_BR=%)',
                    p_date, v_today;
  END IF;

  DELETE FROM stock_daily_summary WHERE summary_date > v_today;
  GET DIAGNOSTICS v_purged = ROW_COUNT;
  IF v_purged > 0 THEN
    RAISE WARNING 'fn_aggregate_stock_daily: limpadas % entradas de datas futuras', v_purged;
  END IF;

  WITH open_close AS (
    SELECT DISTINCT ON (variant_supplier_source_id)
      variant_supplier_source_id, supplier_id, supplier_branch_id, variant_id, product_id,
      FIRST_VALUE(stock_total_old) OVER w AS stock_open,
      stock_total_new AS stock_close,
      -- FIX GAP-3: LEAST(old,new) garante min correto mesmo quando estoque cai
      -- A fórmula anterior MIN(COALESCE(old,new)) pegava só old e falhava quando old>new com sync_count=1
      MIN(LEAST(COALESCE(stock_total_old, stock_total_new),
                COALESCE(stock_total_new, stock_total_old))) OVER w AS stock_min,
      MAX(GREATEST(COALESCE(stock_total_old, stock_total_new),
                   COALESCE(stock_total_new, stock_total_old))) OVER w AS stock_max,
      SUM(COALESCE(stock_main_delta,0) + COALESCE(stock_other_delta,0)) OVER w AS net_change,
      SUM(GREATEST(0, -(COALESCE(stock_main_delta,0) + COALESCE(stock_other_delta,0)))) OVER w AS units_depleted,
      SUM(GREATEST(0,   COALESCE(stock_main_delta,0) + COALESCE(stock_other_delta,0)))  OVER w AS units_restocked,
      BOOL_OR(COALESCE(stock_main_delta,0) + COALESCE(stock_other_delta,0) > 0) OVER w AS restock_detected,
      SUM(CASE WHEN COALESCE(stock_main_delta,0) + COALESCE(stock_other_delta,0) > 0 THEN 1 ELSE 0 END) OVER w AS restock_count,
      MAX(CASE WHEN COALESCE(stock_main_delta,0) + COALESCE(stock_other_delta,0) > 0
               THEN COALESCE(stock_main_delta,0) + COALESCE(stock_other_delta,0) ELSE 0 END) OVER w AS restock_quantity,
      BOOL_OR(COALESCE(cost_price_delta,0) <> 0) OVER w AS price_changed,
      FIRST_VALUE(cost_price_old) OVER w AS cost_price_open,
      cost_price_new AS cost_price_close,
      COUNT(*) OVER w AS sync_count
    FROM stock_snapshots
    WHERE (captured_at AT TIME ZONE 'America/Sao_Paulo')::date = p_date   -- BUCKETING POR DATA BR
      AND variant_supplier_source_id IS NOT NULL
      AND variant_supplier_source_id::text NOT LIKE '%-99999-%'
    WINDOW w AS (PARTITION BY variant_supplier_source_id ORDER BY captured_at
                 ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
    ORDER BY variant_supplier_source_id, captured_at DESC
  )
  INSERT INTO stock_daily_summary (
    variant_supplier_source_id, supplier_id, supplier_branch_id, variant_id, product_id,
    summary_date, stock_open, stock_close, stock_min, stock_max, net_change,
    units_depleted, units_restocked, restock_detected, restock_quantity, restock_count,
    restock_zero_to_positive,
    cost_price_open, cost_price_close, price_changed, sync_count
  )
  SELECT
    variant_supplier_source_id, supplier_id, supplier_branch_id, variant_id, product_id,
    p_date, stock_open, stock_close, stock_min, stock_max, net_change,
    units_depleted::int, units_restocked::int,
    restock_detected, restock_quantity::int, restock_count::smallint,
    (COALESCE(stock_open,0) = 0 AND COALESCE(stock_close,0) > 0),
    cost_price_open, cost_price_close, price_changed, sync_count::smallint
  FROM open_close
  ON CONFLICT (variant_supplier_source_id, summary_date) DO UPDATE SET
    stock_close               = EXCLUDED.stock_close,
    stock_min                 = LEAST(stock_daily_summary.stock_min, EXCLUDED.stock_min),
    stock_max                 = GREATEST(stock_daily_summary.stock_max, EXCLUDED.stock_max),
    net_change                = EXCLUDED.net_change,
    units_depleted            = EXCLUDED.units_depleted,
    units_restocked           = EXCLUDED.units_restocked,
    restock_detected          = EXCLUDED.restock_detected,
    restock_quantity          = EXCLUDED.restock_quantity,
    restock_count             = EXCLUDED.restock_count,
    restock_zero_to_positive  = (COALESCE(stock_daily_summary.stock_open,0) = 0
                                  AND COALESCE(EXCLUDED.stock_close,0) > 0),
    cost_price_close          = EXCLUDED.cost_price_close,
    price_changed             = EXCLUDED.price_changed,
    sync_count                = EXCLUDED.sync_count;
  GET DIAGNOSTICS v_upserted = ROW_COUNT;

  WITH missing AS (
    SELECT vss.id, vss.supplier_id, vss.supplier_branch_id, vss.variant_id,
           pv.product_id, vss.quantity AS cur_stock, vss.cost_price
    FROM variant_supplier_sources vss
    JOIN product_variants pv ON pv.id = vss.variant_id AND pv.is_active = true
    WHERE vss.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM stock_daily_summary sd
        WHERE sd.variant_supplier_source_id = vss.id AND sd.summary_date = p_date
      )
  )
  INSERT INTO stock_daily_summary (
    variant_supplier_source_id, supplier_id, supplier_branch_id, variant_id, product_id,
    summary_date, stock_open, stock_close, stock_min, stock_max, net_change,
    units_depleted, units_restocked, restock_detected, restock_quantity, restock_count,
    restock_zero_to_positive,
    cost_price_open, cost_price_close, price_changed, sync_count
  )
  SELECT id, supplier_id, supplier_branch_id, variant_id, product_id,
    p_date, cur_stock, cur_stock, cur_stock, cur_stock,
    0, 0, 0, false, 0, 0,
    false,
    cost_price, cost_price, false, 1
  FROM missing
  ON CONFLICT (variant_supplier_source_id, summary_date) DO NOTHING;
  GET DIAGNOSTICS v_baseline = ROW_COUNT;

  RETURN jsonb_build_object(
    'date', p_date, 'executed_at', NOW(),
    'version', 'v5_sp_tz_minmax_fix',
    'sentinel_guard', 'xbz_99999_excluded_from_deltas',
    'snapshots_purged', v_purged,
    'baseline_inserted', v_baseline,
    'summaries_upserted', v_upserted
  );
END;
$function$
