
-- FIX #1+#2 COMBINADO: Recriar mv_stock_velocity com net_change (depleção líquida diária)
-- + Incluir nas MVs na função refresh + views públicas wrapper

-- PASSO 1: Remover views públicas wrapper (dependem das MVs analytics)
DROP VIEW IF EXISTS public.mv_stock_velocity CASCADE;
DROP VIEW IF EXISTS public.mv_product_intelligence CASCADE;

-- PASSO 2: Remover MVs (dependência: mv_product_intelligence depende de mv_stock_velocity)
DROP MATERIALIZED VIEW IF EXISTS analytics.mv_product_intelligence;
DROP MATERIALIZED VIEW IF EXISTS analytics.mv_stock_velocity;

-- PASSO 3: Recriar mv_stock_velocity com net_change (elimina oscilação intradiária XBZ)
CREATE MATERIALIZED VIEW analytics.mv_stock_velocity AS
WITH latest_per_vss AS (
  -- Último registro por VSS (mais recente = estoque atual)
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
  -- Depleção líquida 7d: usa net_change para eliminar ruído intradiário XBZ
  SELECT
    sd.variant_supplier_source_id,
    SUM(GREATEST(0, -COALESCE(sd.net_change, 0))) AS depleted,
    SUM(GREATEST(0,  COALESCE(sd.net_change, 0))) AS restocked,
    COUNT(*) FILTER (WHERE sd.sync_count > 0)     AS active_days
  FROM stock_daily_summary sd
  WHERE sd.summary_date >= CURRENT_DATE - 7
  GROUP BY sd.variant_supplier_source_id
),
agg_30d AS (
  SELECT
    sd.variant_supplier_source_id,
    SUM(GREATEST(0, -COALESCE(sd.net_change, 0))) AS depleted,
    SUM(GREATEST(0,  COALESCE(sd.net_change, 0))) AS restocked,
    COUNT(*) FILTER (WHERE sd.sync_count > 0)     AS active_days,
    COUNT(*) FILTER (WHERE sd.restock_detected)   AS restock_events,
    COUNT(*) FILTER (WHERE sd.price_changed)      AS price_changes
  FROM stock_daily_summary sd
  WHERE sd.summary_date >= CURRENT_DATE - 30
  GROUP BY sd.variant_supplier_source_id
),
agg_90d AS (
  SELECT
    sd.variant_supplier_source_id,
    SUM(GREATEST(0, -COALESCE(sd.net_change, 0))) AS depleted,
    COUNT(*) FILTER (WHERE sd.sync_count > 0)     AS active_days
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
  COALESCE(a7.depleted, 0)  AS total_depleted_7d,
  COALESCE(a30.depleted, 0) AS total_depleted_30d,
  COALESCE(a90.depleted, 0) AS total_depleted_90d,
  a7.active_days            AS active_days_7d,
  a30.active_days           AS active_days_30d,
  a90.active_days           AS active_days_90d,
  ROUND(COALESCE((a7.depleted)::numeric  / NULLIF(a7.active_days, 0)::numeric, 0), 2)  AS avg_daily_depletion_7d,
  ROUND(COALESCE((a30.depleted)::numeric / NULLIF(a30.active_days,0)::numeric, 0), 2)  AS avg_daily_depletion_30d,
  ROUND(COALESCE((a90.depleted)::numeric / NULLIF(a90.active_days,0)::numeric, 0), 2)  AS avg_daily_depletion_90d,
  CASE
    WHEN COALESCE((a30.depleted)::numeric / NULLIF(a30.active_days,0)::numeric, 0) > 0
    THEN ROUND(
      COALESCE((a7.depleted)::numeric  / NULLIF(a7.active_days, 0)::numeric, 0) /
      ((a30.depleted)::numeric / (a30.active_days)::numeric), 2)
    ELSE NULL
  END AS velocity_trend,
  CASE
    WHEN COALESCE((a7.depleted)::numeric / NULLIF(a7.active_days,0)::numeric, 0) > 0
    THEN ROUND(
      (l.current_stock)::numeric /
      ((a7.depleted)::numeric / (a7.active_days)::numeric), 1)
    ELSE NULL
  END AS days_to_stockout,
  COALESCE(a30.restocked,     0) AS total_restocked_30d,
  COALESCE(a30.restock_events,0) AS restock_events_30d,
  CASE
    WHEN COALESCE(a30.restock_events, 0) > 1
    THEN ROUND(30.0 / (a30.restock_events)::numeric, 1)
    ELSE NULL
  END AS avg_days_between_restocks,
  COALESCE(a30.price_changes, 0) AS price_changes_30d,
  now() AS refreshed_at
FROM latest_per_vss l
LEFT JOIN agg_7d  a7  ON a7.variant_supplier_source_id  = l.variant_supplier_source_id
LEFT JOIN agg_30d a30 ON a30.variant_supplier_source_id = l.variant_supplier_source_id
LEFT JOIN agg_90d a90 ON a90.variant_supplier_source_id = l.variant_supplier_source_id
WITH NO DATA;

-- PASSO 4: Índices em mv_stock_velocity (único obrigatório para CONCURRENTLY)
CREATE UNIQUE INDEX idx_mv_velocity_vss
  ON analytics.mv_stock_velocity (variant_supplier_source_id);
CREATE INDEX idx_mv_velocity_product
  ON analytics.mv_stock_velocity (product_id);
CREATE INDEX idx_mv_velocity_supplier
  ON analytics.mv_stock_velocity (supplier_id);
CREATE INDEX idx_mv_velocity_stockout
  ON analytics.mv_stock_velocity (days_to_stockout);

-- PASSO 5: Recriar mv_product_intelligence (mesma lógica, depende da nova velocity)
CREATE MATERIALIZED VIEW analytics.mv_product_intelligence AS
WITH product_metrics AS (
  SELECT
    sv.product_id,
    SUM(sv.total_depleted_30d) AS total_depleted_30d,
    SUM(sv.total_depleted_90d) AS total_depleted_90d,
    SUM(sv.current_stock)      AS total_current_stock,
    AVG(sv.avg_daily_depletion_7d)  AS avg_depletion_7d,
    AVG(sv.avg_daily_depletion_30d) AS avg_depletion_30d,
    MIN(sv.days_to_stockout)        AS min_days_to_stockout,
    MAX(sv.velocity_trend)          AS max_velocity_trend,
    SUM(sv.total_restocked_30d)     AS total_restocked_30d,
    COUNT(*)                        AS supplier_count,
    AVG(sv.current_price)           AS avg_current_price
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
    WHEN depletion_rank <= 0.20 THEN 'A'
    WHEN depletion_rank <= 0.50 THEN 'B'
    ELSE 'C'
  END AS abc_classification,
  LEAST(100::numeric, ROUND(
    (COALESCE(avg_depletion_30d, 0) * 5 +
     CASE WHEN COALESCE(max_velocity_trend, 0) > 1 THEN max_velocity_trend * 10 ELSE 0 END +
     CASE WHEN COALESCE(total_restocked_30d, 0) > 0 THEN 15 ELSE 0 END::numeric), 1))
    AS turnover_score,
  (COALESCE(max_velocity_trend, 0) > 1.5  AND COALESCE(min_days_to_stockout, 999) < 15) AS is_hot_product,
  (COALESCE(total_depleted_30d, 0) < 5    AND COALESCE(total_current_stock, 0)::bigint > 100) AS is_stagnant,
  (COALESCE(total_depleted_30d, 0) < 5    AND COALESCE(total_current_stock, 0)::bigint > 500) AS is_negotiation_opportunity,
  (COALESCE(min_days_to_stockout, 999) < 7 AND COALESCE(avg_depletion_30d, 0) > 1) AS is_stockout_risk,
  (COALESCE(total_restocked_30d, 0) > COALESCE(total_depleted_30d, 0) * 0.5) AS has_frequent_restock,
  now() AS refreshed_at
FROM ranked r
WITH NO DATA;

-- PASSO 6: Índices em mv_product_intelligence (único obrigatório para CONCURRENTLY)
CREATE UNIQUE INDEX idx_mv_intelligence_product
  ON analytics.mv_product_intelligence (product_id);
CREATE INDEX idx_mv_intelligence_abc
  ON analytics.mv_product_intelligence (abc_classification);
CREATE INDEX idx_mv_intelligence_hot
  ON analytics.mv_product_intelligence (is_hot_product)
  WHERE is_hot_product = true;
CREATE INDEX idx_mv_intelligence_stagnant
  ON analytics.mv_product_intelligence (is_stagnant)
  WHERE is_stagnant = true;
CREATE INDEX idx_mv_intelligence_stockout
  ON analytics.mv_product_intelligence (is_stockout_risk)
  WHERE is_stockout_risk = true;
CREATE INDEX idx_mv_intelligence_score
  ON analytics.mv_product_intelligence (turnover_score DESC);

-- PASSO 7: Recriar views públicas wrapper (anon/authenticated precisam acessar via public)
CREATE OR REPLACE VIEW public.mv_stock_velocity AS
  SELECT * FROM analytics.mv_stock_velocity;

CREATE OR REPLACE VIEW public.mv_product_intelligence AS
  SELECT * FROM analytics.mv_product_intelligence;

-- PASSO 8: Atualizar refresh_all_materialized_views para incluir as MVs de Intelligence
CREATE OR REPLACE FUNCTION public.refresh_all_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'analytics'
AS $function$
BEGIN
  -- MVs com índice único → CONCURRENTLY (não bloqueia leituras)
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_product_cards;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_product_compositions;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_material_group_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_media_health;
  -- MVs de Intelligence: velocity PRIMEIRO (product_intelligence depende dela)
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_stock_velocity;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_product_intelligence;
  -- MV sem índice único → refresh normal
  REFRESH MATERIALIZED VIEW analytics.categories_tree_visual;
  RAISE LOG '[refresh_all_materialized_views] Concluído (7 MVs) em %', clock_timestamp();
END;
$function$;
;
