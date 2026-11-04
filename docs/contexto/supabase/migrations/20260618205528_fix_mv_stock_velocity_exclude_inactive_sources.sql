-- CRÍTICO-1: mv_stock_velocity was including 42 inactive variant_supplier_sources.
-- The MV is built from stock_daily_summary (historical log) without joining
-- variant_supplier_sources to check is_active. Fix: add INNER JOIN on vss.is_active=true.
-- Also recreates dependent views/MVs that cascade from the drop.

-- 1. Drop all cascade dependents
DROP MATERIALIZED VIEW IF EXISTS analytics.mv_stock_velocity CASCADE;

-- 2. Recreate analytics.mv_stock_velocity with the is_active filter
CREATE MATERIALIZED VIEW analytics.mv_stock_velocity AS
WITH latest_per_vss AS (
  SELECT DISTINCT ON (sd.variant_supplier_source_id)
    sd.variant_supplier_source_id,
    sd.supplier_id,
    sd.supplier_branch_id,
    sd.variant_id,
    sd.product_id,
    sd.stock_close          AS current_stock,
    sd.cost_price_close     AS current_price,
    sd.summary_date         AS last_update_date
  FROM stock_daily_summary sd
  WHERE sd.sync_count > 0
  ORDER BY sd.variant_supplier_source_id, sd.summary_date DESC
),
agg_7d AS (
  SELECT
    sd.variant_supplier_source_id,
    sum(GREATEST(0, -(COALESCE(sd.net_change, 0))))  AS depleted,
    sum(GREATEST(0,   COALESCE(sd.net_change, 0)))   AS restocked,
    count(*) FILTER (WHERE sd.sync_count > 0)        AS active_days
  FROM stock_daily_summary sd
  WHERE sd.summary_date >= CURRENT_DATE - 7
  GROUP BY sd.variant_supplier_source_id
),
agg_30d AS (
  SELECT
    sd.variant_supplier_source_id,
    sum(GREATEST(0, -(COALESCE(sd.net_change, 0))))                AS depleted,
    sum(GREATEST(0,   COALESCE(sd.net_change, 0)))                 AS restocked,
    count(*) FILTER (WHERE sd.sync_count > 0)                      AS active_days,
    count(*) FILTER (WHERE sd.restock_zero_to_positive = true)     AS restock_events,
    count(*) FILTER (WHERE sd.price_changed)                       AS price_changes
  FROM stock_daily_summary sd
  WHERE sd.summary_date >= CURRENT_DATE - 30
  GROUP BY sd.variant_supplier_source_id
),
agg_90d AS (
  SELECT
    sd.variant_supplier_source_id,
    sum(GREATEST(0, -(COALESCE(sd.net_change, 0)))) AS depleted,
    count(*) FILTER (WHERE sd.sync_count > 0)       AS active_days
  FROM stock_daily_summary sd
  WHERE sd.summary_date >= CURRENT_DATE - 90
  GROUP BY sd.variant_supplier_source_id
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
  COALESCE(a7.depleted,  0::bigint) AS total_depleted_7d,
  COALESCE(a30.depleted, 0::bigint) AS total_depleted_30d,
  COALESCE(a90.depleted, 0::bigint) AS total_depleted_90d,
  a7.active_days  AS active_days_7d,
  a30.active_days AS active_days_30d,
  a90.active_days AS active_days_90d,
  round(COALESCE(a7.depleted::numeric  / NULLIF(a7.active_days,  0)::numeric, 0), 2) AS avg_daily_depletion_7d,
  round(COALESCE(a30.depleted::numeric / NULLIF(a30.active_days, 0)::numeric, 0), 2) AS avg_daily_depletion_30d,
  round(COALESCE(a90.depleted::numeric / NULLIF(a90.active_days, 0)::numeric, 0), 2) AS avg_daily_depletion_90d,
  CASE
    WHEN COALESCE(a30.depleted::numeric / NULLIF(a30.active_days, 0)::numeric, 0) > 0
    THEN round(
      COALESCE(a7.depleted::numeric / NULLIF(a7.active_days, 0)::numeric, 0)
      / (a30.depleted::numeric / a30.active_days::numeric), 2)
    ELSE NULL::numeric
  END AS velocity_trend,
  CASE
    WHEN COALESCE(a7.depleted::numeric / NULLIF(a7.active_days, 0)::numeric, 0) > 0
    THEN round(l.current_stock::numeric / (a7.depleted::numeric / a7.active_days::numeric), 1)
    ELSE NULL::numeric
  END AS days_to_stockout,
  COALESCE(a30.restocked,      0::bigint) AS total_restocked_30d,
  COALESCE(a30.restock_events, 0::bigint) AS restock_events_30d,
  CASE
    WHEN COALESCE(a30.restock_events, 0::bigint) > 1
    THEN round(30.0 / a30.restock_events::numeric, 1)
    ELSE NULL::numeric
  END AS avg_days_between_restocks,
  COALESCE(a30.price_changes, 0::bigint) AS price_changes_30d,
  now() AS refreshed_at
FROM latest_per_vss l
-- KEY FIX: exclude sources that have since been deactivated
INNER JOIN variant_supplier_sources vss
       ON  vss.id        = l.variant_supplier_source_id
       AND vss.is_active = true
LEFT JOIN agg_7d  a7  ON a7.variant_supplier_source_id  = l.variant_supplier_source_id
LEFT JOIN agg_30d a30 ON a30.variant_supplier_source_id = l.variant_supplier_source_id
LEFT JOIN agg_90d a90 ON a90.variant_supplier_source_id = l.variant_supplier_source_id;

-- Indexes for PostgREST / frontend queries
CREATE INDEX idx_mv_stock_velocity_variant_id
  ON analytics.mv_stock_velocity (variant_id);
CREATE INDEX idx_mv_stock_velocity_vss_id
  ON analytics.mv_stock_velocity (variant_supplier_source_id);

-- 3. Recreate analytics.mv_product_intelligence (depends on analytics.mv_stock_velocity)
CREATE MATERIALIZED VIEW analytics.mv_product_intelligence AS
WITH product_metrics AS (
  SELECT
    sv.product_id,
    sum(sv.total_depleted_30d)  AS total_depleted_30d,
    sum(sv.total_depleted_90d)  AS total_depleted_90d,
    sum(sv.current_stock)       AS total_current_stock,
    avg(sv.avg_daily_depletion_7d)  AS avg_depletion_7d,
    avg(sv.avg_daily_depletion_30d) AS avg_depletion_30d,
    min(sv.days_to_stockout)    AS min_days_to_stockout,
    max(sv.velocity_trend)      AS max_velocity_trend,
    sum(sv.total_restocked_30d) AS total_restocked_30d,
    count(*)                    AS supplier_count,
    avg(sv.current_price)       AS avg_current_price
  FROM analytics.mv_stock_velocity sv
  GROUP BY sv.product_id
),
ranked AS (
  SELECT
    pm.*,
    percent_rank() OVER (ORDER BY pm.total_depleted_30d DESC) AS depletion_rank
  FROM product_metrics pm
)
SELECT
  product_id,
  total_depleted_30d,
  total_depleted_90d,
  total_current_stock,
  avg_depletion_7d,
  avg_depletion_30d,
  min_days_to_stockout,
  max_velocity_trend,
  total_restocked_30d,
  supplier_count,
  avg_current_price,
  CASE
    WHEN (total_depleted_30d = 0 OR total_depleted_30d IS NULL) THEN 'C'
    WHEN depletion_rank <= 0.20                                  THEN 'A'
    WHEN depletion_rank <= 0.50                                  THEN 'B'
    ELSE 'C'
  END AS abc_classification,
  LEAST(100::numeric,
    round((
      COALESCE(avg_depletion_30d, 0) * 5
      + CASE WHEN COALESCE(max_velocity_trend, 0) > 1 THEN max_velocity_trend * 10 ELSE 0 END
      + CASE WHEN COALESCE(total_restocked_30d, 0) > 0 THEN 15 ELSE 0 END::numeric
    ), 1)
  ) AS turnover_score,
  (COALESCE(max_velocity_trend, 0) > 1.5 AND COALESCE(min_days_to_stockout, 999) < 15) AS is_hot_product,
  (COALESCE(total_depleted_30d, 0) < 5   AND COALESCE(total_current_stock, 0) > 100)   AS is_stagnant,
  (COALESCE(total_depleted_30d, 0) < 5   AND COALESCE(total_current_stock, 0) > 500)   AS is_negotiation_opportunity,
  (COALESCE(min_days_to_stockout, 999) < 7 AND COALESCE(avg_depletion_30d, 0) > 1)     AS is_stockout_risk,
  (COALESCE(total_restocked_30d, 0) > COALESCE(total_depleted_30d, 0) * 0.5)           AS has_frequent_restock,
  now() AS refreshed_at
FROM ranked r;

CREATE INDEX idx_mv_product_intelligence_product_id
  ON analytics.mv_product_intelligence (product_id);

-- 4. Recreate public pass-through views
CREATE OR REPLACE VIEW public.mv_stock_velocity AS
  SELECT
    variant_supplier_source_id, supplier_id, supplier_branch_id,
    variant_id, product_id, current_stock, current_price, last_update_date,
    total_depleted_7d, total_depleted_30d, total_depleted_90d,
    active_days_7d, active_days_30d, active_days_90d,
    avg_daily_depletion_7d, avg_daily_depletion_30d, avg_daily_depletion_90d,
    velocity_trend, days_to_stockout,
    total_restocked_30d, restock_events_30d, avg_days_between_restocks,
    price_changes_30d, refreshed_at
  FROM analytics.mv_stock_velocity;

CREATE OR REPLACE VIEW public.mv_product_intelligence AS
  SELECT
    product_id, total_depleted_30d, total_depleted_90d, total_current_stock,
    avg_depletion_7d, avg_depletion_30d, min_days_to_stockout, max_velocity_trend,
    total_restocked_30d, supplier_count, avg_current_price,
    abc_classification, turnover_score,
    is_hot_product, is_stagnant, is_negotiation_opportunity,
    is_stockout_risk, has_frequent_restock, refreshed_at
  FROM analytics.mv_product_intelligence;
