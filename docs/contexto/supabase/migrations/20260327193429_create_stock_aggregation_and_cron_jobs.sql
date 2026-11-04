-- ============================================================
-- FUNÇÃO: Agrega snapshots do dia em stock_daily_summary
-- Chamada automaticamente pelo pg_cron todo dia às 19:30 BRT
-- ============================================================

CREATE OR REPLACE FUNCTION fn_aggregate_stock_daily(p_date date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted integer;
  v_updated integer;
  v_purged integer;
BEGIN
  -- PASSO 1: Agregar snapshots do dia em resumo diário
  -- Usa UPSERT para ser idempotente (pode rodar múltiplas vezes sem duplicar)
  WITH daily_agg AS (
    SELECT
      variant_supplier_source_id,
      supplier_id,
      supplier_branch_id,
      variant_id,
      product_id,
      p_date AS summary_date,
      
      -- Estoque total (main + other)
      (FIRST_VALUE(COALESCE(stock_main_new, 0) + COALESCE(stock_other_new, 0)) 
        OVER (PARTITION BY variant_supplier_source_id ORDER BY captured_at ASC)) AS stock_open_val,
      (FIRST_VALUE(COALESCE(stock_main_new, 0) + COALESCE(stock_other_new, 0)) 
        OVER (PARTITION BY variant_supplier_source_id ORDER BY captured_at DESC)) AS stock_close_val,
        
      COALESCE(stock_main_new, 0) + COALESCE(stock_other_new, 0) AS stock_total_new,
      
      -- Preço
      (FIRST_VALUE(cost_price_new) OVER (PARTITION BY variant_supplier_source_id ORDER BY captured_at ASC 
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)) AS price_open_val,
      (FIRST_VALUE(cost_price_new) OVER (PARTITION BY variant_supplier_source_id ORDER BY captured_at DESC 
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)) AS price_close_val,
      
      -- Deltas (stock_total)
      COALESCE(stock_main_delta, 0) + COALESCE(stock_other_delta, 0) AS total_delta
      
    FROM stock_snapshots
    WHERE captured_at::date = p_date
      AND change_type IN ('stock', 'both')
  ),
  summary_calc AS (
    SELECT
      variant_supplier_source_id,
      MIN(supplier_id) AS supplier_id,
      MIN(supplier_branch_id) AS supplier_branch_id,
      MIN(variant_id) AS variant_id,
      MIN(product_id) AS product_id,
      p_date AS summary_date,
      
      MIN(stock_open_val) AS stock_open, -- first value (same for all rows per vss)
      MIN(stock_close_val) AS stock_close,
      MIN(stock_total_new) AS stock_min,
      MAX(stock_total_new) AS stock_max,
      
      -- Movimentação
      SUM(CASE WHEN total_delta < 0 THEN ABS(total_delta) ELSE 0 END) AS units_depleted,
      SUM(CASE WHEN total_delta > 0 THEN total_delta ELSE 0 END) AS units_restocked,
      
      -- Restock detection: delta positivo > 10% do estoque atual
      bool_or(total_delta > GREATEST(stock_total_new * 0.1, 5)) AS restock_detected,
      SUM(CASE WHEN total_delta > GREATEST(stock_total_new * 0.1, 5) THEN total_delta ELSE 0 END)::integer AS restock_quantity,
      COUNT(CASE WHEN total_delta > GREATEST(stock_total_new * 0.1, 5) THEN 1 END)::smallint AS restock_count,
      
      -- Preço
      MIN(price_open_val) AS cost_price_open,
      MIN(price_close_val) AS cost_price_close,
      
      COUNT(*)::smallint AS sync_count
    FROM daily_agg
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
    variant_supplier_source_id, supplier_id, supplier_branch_id,
    variant_id, product_id, summary_date,
    stock_open, stock_close, stock_min, stock_max,
    stock_close - stock_open,
    units_depleted, units_restocked,
    COALESCE(restock_detected, false), COALESCE(restock_quantity, 0), COALESCE(restock_count, 0),
    cost_price_open, cost_price_close,
    (cost_price_open IS DISTINCT FROM cost_price_close),
    sync_count
  FROM summary_calc
  ON CONFLICT (variant_supplier_source_id, summary_date)
  DO UPDATE SET
    stock_open = EXCLUDED.stock_open,
    stock_close = EXCLUDED.stock_close,
    stock_min = EXCLUDED.stock_min,
    stock_max = EXCLUDED.stock_max,
    net_change = EXCLUDED.net_change,
    units_depleted = EXCLUDED.units_depleted,
    units_restocked = EXCLUDED.units_restocked,
    restock_detected = EXCLUDED.restock_detected,
    restock_quantity = EXCLUDED.restock_quantity,
    restock_count = EXCLUDED.restock_count,
    cost_price_open = EXCLUDED.cost_price_open,
    cost_price_close = EXCLUDED.cost_price_close,
    price_changed = EXCLUDED.price_changed,
    sync_count = EXCLUDED.sync_count;
  
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  
  -- PASSO 2: Agregar snapshots de PREÇO puro (sem stock change)
  -- para dias onde só preço mudou
  INSERT INTO stock_daily_summary (
    variant_supplier_source_id, supplier_id, supplier_branch_id,
    variant_id, product_id, summary_date,
    cost_price_open, cost_price_close, price_changed, sync_count
  )
  SELECT
    s.variant_supplier_source_id,
    MIN(s.supplier_id),
    MIN(s.supplier_branch_id),
    MIN(s.variant_id),
    MIN(s.product_id),
    p_date,
    MIN(s.cost_price_new), -- first by default ordering
    MAX(s.cost_price_new), -- last approx
    true,
    COUNT(*)::smallint
  FROM stock_snapshots s
  WHERE s.captured_at::date = p_date
    AND s.change_type = 'price'
    AND NOT EXISTS (
      SELECT 1 FROM stock_daily_summary sd
      WHERE sd.variant_supplier_source_id = s.variant_supplier_source_id
        AND sd.summary_date = p_date
    )
  GROUP BY s.variant_supplier_source_id
  ON CONFLICT (variant_supplier_source_id, summary_date) DO NOTHING;
  
  -- PASSO 3: Purgar snapshots antigos (manter 14 dias)
  DELETE FROM stock_snapshots
  WHERE captured_at < (now() - INTERVAL '14 days');
  
  GET DIAGNOSTICS v_purged = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'date', p_date,
    'summaries_upserted', v_inserted,
    'snapshots_purged', v_purged,
    'executed_at', now()
  );
END;
$$;

COMMENT ON FUNCTION fn_aggregate_stock_daily(date) IS 'Agrega snapshots brutos em resumo diário e purga registros com mais de 14 dias. Idempotente — pode ser executada múltiplas vezes para a mesma data.';

-- ============================================================
-- JOBS pg_cron
-- ============================================================

-- Job 1: Agregação diária às 22:30 UTC (19:30 BRT)
SELECT cron.schedule(
  'stock_daily_aggregation',
  '30 22 * * *',
  $$SELECT fn_aggregate_stock_daily(CURRENT_DATE)$$
);

-- Job 2: Purga de emergência semanal (domingo 03:00 UTC / 00:00 BRT)
-- Caso o job diário falhe, essa purga garante que snapshots não acumulem
SELECT cron.schedule(
  'stock_snapshots_weekly_purge',
  '0 3 * * 0',
  $$DELETE FROM stock_snapshots WHERE captured_at < (now() - INTERVAL '14 days')$$
);
