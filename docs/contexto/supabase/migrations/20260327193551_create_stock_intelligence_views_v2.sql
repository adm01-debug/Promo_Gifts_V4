-- ============================================================
-- CAMADA 3: MATERIALIZED VIEWS DE INTELIGÊNCIA (v2 - fix uuid agg)
-- ============================================================

-- VIEW 1: mv_stock_velocity
CREATE MATERIALIZED VIEW mv_stock_velocity AS
WITH latest_per_vss AS (
  -- Pegar o registro mais recente por vss para dados atuais
  SELECT DISTINCT ON (variant_supplier_source_id)
    variant_supplier_source_id,
    supplier_id,
    supplier_branch_id,
    variant_id,
    product_id,
    stock_close AS current_stock,
    cost_price_close AS current_price,
    summary_date AS last_update_date
  FROM stock_daily_summary
  WHERE sync_count > 0
  ORDER BY variant_supplier_source_id, summary_date DESC
),
agg_7d AS (
  SELECT variant_supplier_source_id,
    SUM(units_depleted) AS depleted,
    SUM(units_restocked) AS restocked,
    COUNT(*) FILTER (WHERE sync_count > 0) AS active_days
  FROM stock_daily_summary
  WHERE summary_date >= CURRENT_DATE - 7
  GROUP BY variant_supplier_source_id
),
agg_30d AS (
  SELECT variant_supplier_source_id,
    SUM(units_depleted) AS depleted,
    SUM(units_restocked) AS restocked,
    COUNT(*) FILTER (WHERE sync_count > 0) AS active_days,
    COUNT(*) FILTER (WHERE restock_detected) AS restock_events,
    COUNT(*) FILTER (WHERE price_changed) AS price_changes
  FROM stock_daily_summary
  WHERE summary_date >= CURRENT_DATE - 30
  GROUP BY variant_supplier_source_id
),
agg_90d AS (
  SELECT variant_supplier_source_id,
    SUM(units_depleted) AS depleted,
    COUNT(*) FILTER (WHERE sync_count > 0) AS active_days
  FROM stock_daily_summary
  WHERE summary_date >= CURRENT_DATE - 90
  GROUP BY variant_supplier_source_id
)
SELECT
  l.variant_supplier_source_id,
  l.supplier_id,
  l.supplier_branch_id,
  l.variant_id,
  l.product_id,
  l.current_stock,
  l.current_price,
  l.last_update_date,
  
  -- Totais por período
  COALESCE(a7.depleted, 0) AS total_depleted_7d,
  COALESCE(a30.depleted, 0) AS total_depleted_30d,
  COALESCE(a90.depleted, 0) AS total_depleted_90d,
  
  a7.active_days AS active_days_7d,
  a30.active_days AS active_days_30d,
  a90.active_days AS active_days_90d,
  
  -- Média diária de depleção
  ROUND(COALESCE(a7.depleted::numeric / NULLIF(a7.active_days, 0), 0), 2) AS avg_daily_depletion_7d,
  ROUND(COALESCE(a30.depleted::numeric / NULLIF(a30.active_days, 0), 0), 2) AS avg_daily_depletion_30d,
  ROUND(COALESCE(a90.depleted::numeric / NULLIF(a90.active_days, 0), 0), 2) AS avg_daily_depletion_90d,
  
  -- Tendência (7d / 30d)
  CASE 
    WHEN COALESCE(a30.depleted::numeric / NULLIF(a30.active_days, 0), 0) > 0 
    THEN ROUND(
      COALESCE(a7.depleted::numeric / NULLIF(a7.active_days, 0), 0) /
      (a30.depleted::numeric / a30.active_days), 2)
    ELSE NULL
  END AS velocity_trend,
  
  -- Dias até ruptura
  CASE 
    WHEN COALESCE(a7.depleted::numeric / NULLIF(a7.active_days, 0), 0) > 0
    THEN ROUND(l.current_stock::numeric / (a7.depleted::numeric / a7.active_days), 1)
    ELSE NULL
  END AS days_to_stockout,
  
  -- Reabastecimento
  COALESCE(a30.restocked, 0) AS total_restocked_30d,
  COALESCE(a30.restock_events, 0) AS restock_events_30d,
  CASE 
    WHEN COALESCE(a30.restock_events, 0) > 1 
    THEN ROUND(30.0 / a30.restock_events, 1)
    ELSE NULL
  END AS avg_days_between_restocks,
  
  COALESCE(a30.price_changes, 0) AS price_changes_30d,
  
  now() AS refreshed_at

FROM latest_per_vss l
LEFT JOIN agg_7d a7 ON a7.variant_supplier_source_id = l.variant_supplier_source_id
LEFT JOIN agg_30d a30 ON a30.variant_supplier_source_id = l.variant_supplier_source_id
LEFT JOIN agg_90d a90 ON a90.variant_supplier_source_id = l.variant_supplier_source_id
WITH NO DATA;

-- Índices
CREATE UNIQUE INDEX idx_mv_velocity_vss ON mv_stock_velocity (variant_supplier_source_id);
CREATE INDEX idx_mv_velocity_product ON mv_stock_velocity (product_id);
CREATE INDEX idx_mv_velocity_supplier ON mv_stock_velocity (supplier_id);
CREATE INDEX idx_mv_velocity_stockout ON mv_stock_velocity (days_to_stockout ASC NULLS LAST);

COMMENT ON MATERIALIZED VIEW mv_stock_velocity IS 'Velocidade de depleção, previsão de ruptura e métricas de reabastecimento. Refresh diário.';


-- ============================================================
-- VIEW 2: mv_product_intelligence
-- ============================================================

CREATE MATERIALIZED VIEW mv_product_intelligence AS
WITH product_metrics AS (
  SELECT
    sv.product_id,
    SUM(sv.total_depleted_30d) AS total_depleted_30d,
    SUM(sv.total_depleted_90d) AS total_depleted_90d,
    SUM(sv.current_stock) AS total_current_stock,
    AVG(sv.avg_daily_depletion_7d) AS avg_depletion_7d,
    AVG(sv.avg_daily_depletion_30d) AS avg_depletion_30d,
    MIN(sv.days_to_stockout) AS min_days_to_stockout,
    MAX(sv.velocity_trend) AS max_velocity_trend,
    SUM(sv.total_restocked_30d) AS total_restocked_30d,
    COUNT(*) AS supplier_count,
    AVG(sv.current_price) AS avg_current_price
  FROM mv_stock_velocity sv
  GROUP BY sv.product_id
),
ranked AS (
  SELECT pm.*,
    PERCENT_RANK() OVER (ORDER BY pm.total_depleted_30d DESC) AS depletion_rank
  FROM product_metrics pm
)
SELECT
  r.product_id,
  r.total_depleted_30d,
  r.total_depleted_90d,
  r.total_current_stock,
  r.avg_depletion_7d,
  r.avg_depletion_30d,
  r.min_days_to_stockout,
  r.max_velocity_trend,
  r.total_restocked_30d,
  r.supplier_count,
  r.avg_current_price,
  
  -- ABC
  CASE
    WHEN r.depletion_rank <= 0.20 THEN 'A'
    WHEN r.depletion_rank <= 0.50 THEN 'B'
    ELSE 'C'
  END AS abc_classification,
  
  -- Turnover Score (0-100)
  LEAST(100, ROUND(
    (COALESCE(r.avg_depletion_30d, 0) * 5) +
    (CASE WHEN COALESCE(r.max_velocity_trend, 0) > 1 THEN r.max_velocity_trend * 10 ELSE 0 END) +
    (CASE WHEN COALESCE(r.total_restocked_30d, 0) > 0 THEN 15 ELSE 0 END)
  , 1)) AS turnover_score,
  
  -- FLAGS
  (COALESCE(r.max_velocity_trend, 0) > 1.5 AND COALESCE(r.min_days_to_stockout, 999) < 15) AS is_hot_product,
  (COALESCE(r.total_depleted_30d, 0) < 5 AND COALESCE(r.total_current_stock, 0) > 100) AS is_stagnant,
  (COALESCE(r.total_depleted_30d, 0) < 5 AND COALESCE(r.total_current_stock, 0) > 500) AS is_negotiation_opportunity,
  (COALESCE(r.min_days_to_stockout, 999) < 7 AND COALESCE(r.avg_depletion_30d, 0) > 1) AS is_stockout_risk,
  (COALESCE(r.total_restocked_30d, 0) > COALESCE(r.total_depleted_30d, 0) * 0.5) AS has_frequent_restock,
  
  now() AS refreshed_at
FROM ranked r
WITH NO DATA;

-- Índices
CREATE UNIQUE INDEX idx_mv_intelligence_product ON mv_product_intelligence (product_id);
CREATE INDEX idx_mv_intelligence_abc ON mv_product_intelligence (abc_classification);
CREATE INDEX idx_mv_intelligence_hot ON mv_product_intelligence (is_hot_product) WHERE is_hot_product = true;
CREATE INDEX idx_mv_intelligence_stagnant ON mv_product_intelligence (is_stagnant) WHERE is_stagnant = true;
CREATE INDEX idx_mv_intelligence_stockout ON mv_product_intelligence (is_stockout_risk) WHERE is_stockout_risk = true;
CREATE INDEX idx_mv_intelligence_score ON mv_product_intelligence (turnover_score DESC);

COMMENT ON MATERIALIZED VIEW mv_product_intelligence IS 'Classificação ABC, scores e alertas de inteligência competitiva por produto. Refresh diário.';


-- ============================================================
-- Jobs pg_cron: Refresh das MVs
-- ============================================================

SELECT cron.schedule(
  'stock_mv_velocity_refresh',
  '0 23 * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stock_velocity$$
);

SELECT cron.schedule(
  'stock_mv_intelligence_refresh',
  '10 23 * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_intelligence$$
);
