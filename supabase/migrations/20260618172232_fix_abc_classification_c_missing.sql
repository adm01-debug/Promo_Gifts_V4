
-- MELHORIA 2 (2026-06-18): Corrigir abc_classification em analytics.mv_product_intelligence
-- Bug: percent_rank() com 3 926 empates em total_depleted_30d=0 recebe rank=0.458 ≤ 0.50
-- → todos classificados como B em vez de C
-- Fix: produtos com depletion=0 são SEMPRE C, independente do percent_rank

DROP MATERIALIZED VIEW IF EXISTS analytics.mv_product_intelligence CASCADE;

CREATE MATERIALIZED VIEW analytics.mv_product_intelligence AS
WITH product_metrics AS (
  SELECT
    sv.product_id,
    SUM(sv.total_depleted_30d)       AS total_depleted_30d,
    SUM(sv.total_depleted_90d)       AS total_depleted_90d,
    SUM(sv.current_stock)            AS total_current_stock,
    AVG(sv.avg_daily_depletion_7d)   AS avg_depletion_7d,
    AVG(sv.avg_daily_depletion_30d)  AS avg_depletion_30d,
    MIN(sv.days_to_stockout)         AS min_days_to_stockout,
    MAX(sv.velocity_trend)           AS max_velocity_trend,
    SUM(sv.total_restocked_30d)      AS total_restocked_30d,
    COUNT(*)                         AS supplier_count,
    AVG(sv.current_price)            AS avg_current_price
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
  -- FIX 2026-06-18: produtos sem depletion são SEMPRE C.
  -- Bug anterior: percent_rank() com 3 926 empates em 0 recebia rank=0.458 ≤ 0.50 → B.
  CASE
    WHEN (total_depleted_30d = 0 OR total_depleted_30d IS NULL) THEN 'C'::text
    WHEN (depletion_rank <= 0.20)                               THEN 'A'::text
    WHEN (depletion_rank <= 0.50)                               THEN 'B'::text
    ELSE                                                              'C'::text
  END AS abc_classification,
  LEAST(100::numeric,
    ROUND((
      COALESCE(avg_depletion_30d, 0) * 5 +
      CASE WHEN COALESCE(max_velocity_trend, 0) > 1 THEN max_velocity_trend * 10 ELSE 0 END +
      CASE WHEN COALESCE(total_restocked_30d, 0) > 0 THEN 15 ELSE 0 END::numeric
    ), 1)
  ) AS turnover_score,
  ((COALESCE(max_velocity_trend, 0) > 1.5) AND (COALESCE(min_days_to_stockout, 999) < 15))
    AS is_hot_product,
  ((COALESCE(total_depleted_30d, 0) < 5) AND (COALESCE(total_current_stock, 0) > 100))
    AS is_stagnant,
  ((COALESCE(total_depleted_30d, 0) < 5) AND (COALESCE(total_current_stock, 0) > 500))
    AS is_negotiation_opportunity,
  ((COALESCE(min_days_to_stockout, 999) < 7) AND (COALESCE(avg_depletion_30d, 0) > 1))
    AS is_stockout_risk,
  (COALESCE(total_restocked_30d, 0) > COALESCE(total_depleted_30d, 0) * 0.5)
    AS has_frequent_restock,
  NOW() AS refreshed_at
FROM ranked r;

-- Índices da MV
CREATE UNIQUE INDEX mv_product_intelligence_pk
  ON analytics.mv_product_intelligence (product_id);

CREATE INDEX mv_product_intelligence_abc_idx
  ON analytics.mv_product_intelligence (abc_classification);

CREATE INDEX mv_product_intelligence_turnover_idx
  ON analytics.mv_product_intelligence (turnover_score DESC);

-- Permissões
GRANT SELECT ON analytics.mv_product_intelligence TO authenticated, anon;

-- Recriar view pública (dropped by CASCADE)
CREATE OR REPLACE VIEW public.mv_product_intelligence AS
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
  abc_classification,
  turnover_score,
  is_hot_product,
  is_stagnant,
  is_negotiation_opportunity,
  is_stockout_risk,
  has_frequent_restock,
  refreshed_at
FROM analytics.mv_product_intelligence;

GRANT SELECT ON public.mv_product_intelligence TO authenticated, anon;
;
