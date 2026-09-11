
-- FIX #2: Adicionar guard contra sentinel XBZ 99.999 em fn_aggregate_stock_daily
-- Root cause: XBZ usa stock_main_new=99999 como valor sentinela ("estoque ilimitado")
-- Isso gerava deltas absurdos (5M+/dia) inflando units_depleted/restocked
-- Fix: excluir snapshots onde stock_new = 99999 dos cálculos de delta

CREATE OR REPLACE FUNCTION public.fn_aggregate_stock_daily(p_date date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_upserted integer;
  v_purged   integer;
BEGIN
  -- PASSO 1: Agregar snapshots de estoque via UPSERT (idempotente)
  WITH open_close AS (
    SELECT DISTINCT ON (variant_supplier_source_id)
      variant_supplier_source_id,
      supplier_id,
      supplier_branch_id,
      variant_id,
      product_id,
      COALESCE(stock_main_new, 0) + COALESCE(stock_other_new, 0) AS stock_open_val,
      cost_price_new AS price_open_val
    FROM stock_snapshots
    WHERE captured_at::date = p_date
      AND change_type IN ('stock', 'both')
    ORDER BY variant_supplier_source_id, captured_at ASC
  ),
  close_vals AS (
    SELECT DISTINCT ON (variant_supplier_source_id)
      variant_supplier_source_id,
      COALESCE(stock_main_new, 0) + COALESCE(stock_other_new, 0) AS stock_close_val,
      cost_price_new AS price_close_val
    FROM stock_snapshots
    WHERE captured_at::date = p_date
      AND change_type IN ('stock', 'both')
    ORDER BY variant_supplier_source_id, captured_at DESC
  ),
  agg_deltas AS (
    SELECT
      variant_supplier_source_id,
      MIN(COALESCE(stock_main_new, 0) + COALESCE(stock_other_new, 0)) AS stock_min,
      MAX(COALESCE(stock_main_new, 0) + COALESCE(stock_other_new, 0)) AS stock_max,
      -- FIX: excluir sentinel XBZ 99999 dos cálculos de delta
      -- Qualquer snapshot onde stock_new = 99999 é valor sentinela ("ilimitado"), não real
      SUM(CASE 
            WHEN (COALESCE(stock_main_delta, 0) + COALESCE(stock_other_delta, 0)) < 0
              AND COALESCE(stock_main_new, 0) + COALESCE(stock_other_new, 0) < 99999
            THEN ABS(COALESCE(stock_main_delta, 0) + COALESCE(stock_other_delta, 0))
            ELSE 0
          END) AS units_depleted,
      SUM(CASE 
            WHEN (COALESCE(stock_main_delta, 0) + COALESCE(stock_other_delta, 0)) > 0
              AND COALESCE(stock_main_new, 0) + COALESCE(stock_other_new, 0) < 99999
            THEN (COALESCE(stock_main_delta, 0) + COALESCE(stock_other_delta, 0))
            ELSE 0
          END) AS units_restocked,
      bool_or(
        (COALESCE(stock_main_delta, 0) + COALESCE(stock_other_delta, 0)) > 
        GREATEST((COALESCE(stock_main_new, 0) + COALESCE(stock_other_new, 0)) * 0.1, 5)
        AND COALESCE(stock_main_new, 0) + COALESCE(stock_other_new, 0) < 99999
      ) AS restock_detected,
      SUM(CASE 
            WHEN (COALESCE(stock_main_delta, 0) + COALESCE(stock_other_delta, 0)) >
              GREATEST((COALESCE(stock_main_new, 0) + COALESCE(stock_other_new, 0)) * 0.1, 5)
              AND COALESCE(stock_main_new, 0) + COALESCE(stock_other_new, 0) < 99999
            THEN (COALESCE(stock_main_delta, 0) + COALESCE(stock_other_delta, 0))
            ELSE 0
          END)::integer AS restock_quantity,
      COUNT(*) FILTER (
        WHERE (COALESCE(stock_main_delta, 0) + COALESCE(stock_other_delta, 0)) >
          GREATEST((COALESCE(stock_main_new, 0) + COALESCE(stock_other_new, 0)) * 0.1, 5)
          AND COALESCE(stock_main_new, 0) + COALESCE(stock_other_new, 0) < 99999
      )::smallint AS restock_count,
      COUNT(*)::smallint AS sync_count
    FROM stock_snapshots
    WHERE captured_at::date = p_date
      AND change_type IN ('stock', 'both')
    GROUP BY variant_supplier_source_id
  )
  INSERT INTO stock_daily_summary (
    variant_supplier_source_id, supplier_id, supplier_branch_id,
    variant_id, product_id, summary_date,
    stock_open, stock_close, stock_min, stock_max, net_change,
    units_depleted, units_restocked,
    restock_detected, restock_quantity, restock_count,
    cost_price_open, cost_price_close, price_changed,
    sync_count
  )
  SELECT
    oc.variant_supplier_source_id,
    oc.supplier_id,
    oc.supplier_branch_id,
    oc.variant_id,
    oc.product_id,
    p_date,
    oc.stock_open_val,
    cv.stock_close_val,
    ad.stock_min,
    ad.stock_max,
    cv.stock_close_val - oc.stock_open_val,
    COALESCE(ad.units_depleted, 0),
    COALESCE(ad.units_restocked, 0),
    COALESCE(ad.restock_detected, false),
    COALESCE(ad.restock_quantity, 0),
    COALESCE(ad.restock_count, 0),
    oc.price_open_val,
    cv.price_close_val,
    (oc.price_open_val IS DISTINCT FROM cv.price_close_val),
    COALESCE(ad.sync_count, 0)
  FROM open_close oc
  JOIN close_vals cv ON cv.variant_supplier_source_id = oc.variant_supplier_source_id
  JOIN agg_deltas ad ON ad.variant_supplier_source_id = oc.variant_supplier_source_id
  ON CONFLICT (variant_supplier_source_id, summary_date)
  DO UPDATE SET
    stock_open       = EXCLUDED.stock_open,
    stock_close      = EXCLUDED.stock_close,
    stock_min        = EXCLUDED.stock_min,
    stock_max        = EXCLUDED.stock_max,
    net_change       = EXCLUDED.net_change,
    units_depleted   = EXCLUDED.units_depleted,
    units_restocked  = EXCLUDED.units_restocked,
    restock_detected = EXCLUDED.restock_detected,
    restock_quantity = EXCLUDED.restock_quantity,
    restock_count    = EXCLUDED.restock_count,
    cost_price_open  = EXCLUDED.cost_price_open,
    cost_price_close = EXCLUDED.cost_price_close,
    price_changed    = EXCLUDED.price_changed,
    sync_count       = EXCLUDED.sync_count;

  GET DIAGNOSTICS v_upserted = ROW_COUNT;

  -- PASSO 2: Capturar snapshots de preço puro (sem mudança de estoque)
  INSERT INTO stock_daily_summary (
    variant_supplier_source_id, supplier_id, supplier_branch_id,
    variant_id, product_id, summary_date,
    cost_price_open, cost_price_close, price_changed, sync_count
  )
  SELECT DISTINCT ON (s.variant_supplier_source_id)
    s.variant_supplier_source_id,
    s.supplier_id,
    s.supplier_branch_id,
    s.variant_id,
    s.product_id,
    p_date,
    (SELECT ss.cost_price_new FROM stock_snapshots ss
     WHERE ss.variant_supplier_source_id = s.variant_supplier_source_id
       AND ss.captured_at::date = p_date AND ss.change_type = 'price'
     ORDER BY ss.captured_at ASC LIMIT 1),
    (SELECT ss.cost_price_new FROM stock_snapshots ss
     WHERE ss.variant_supplier_source_id = s.variant_supplier_source_id
       AND ss.captured_at::date = p_date AND ss.change_type = 'price'
     ORDER BY ss.captured_at DESC LIMIT 1),
    true,
    COUNT(*) OVER (PARTITION BY s.variant_supplier_source_id)::smallint
  FROM stock_snapshots s
  WHERE s.captured_at::date = p_date
    AND s.change_type = 'price'
    AND NOT EXISTS (
      SELECT 1 FROM stock_daily_summary sd
      WHERE sd.variant_supplier_source_id = s.variant_supplier_source_id
        AND sd.summary_date = p_date
    )
  ORDER BY s.variant_supplier_source_id, s.captured_at ASC
  ON CONFLICT (variant_supplier_source_id, summary_date) DO NOTHING;

  -- PASSO 3: Purgar snapshots antigos (manter 14 dias)
  DELETE FROM stock_snapshots
  WHERE captured_at < (now() - INTERVAL '14 days');

  GET DIAGNOSTICS v_purged = ROW_COUNT;

  RETURN jsonb_build_object(
    'date',                p_date,
    'summaries_upserted',  v_upserted,
    'snapshots_purged',    v_purged,
    'sentinel_guard',      'xbz_99999_excluded_from_deltas',
    'executed_at',         now()
  );
END;
$function$;
;
