CREATE OR REPLACE FUNCTION public.fn_get_replenishment_stats()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH
  cfg AS (SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date AS today),
  cenario_a AS (
    SELECT DISTINCT sds.product_id, sds.supplier_id, sds.summary_date
    FROM stock_daily_summary sds
    JOIN products p ON p.id = sds.product_id AND p.is_active = true
    WHERE sds.restock_zero_to_positive = true
      AND COALESCE(sds.stock_close, 0) > 0
      AND sds.summary_date >= (SELECT today FROM cfg) - 30
  ),
  cenario_b AS (
    SELECT DISTINCT sds.product_id, sds.supplier_id, sds.summary_date
    FROM stock_daily_summary sds
    JOIN products p ON p.id = sds.product_id AND p.is_active = true
    WHERE COALESCE(sds.stock_open, 0) > 0
      AND COALESCE(sds.stock_close, 0) > COALESCE(sds.stock_open, 0)
      AND sds.restock_detected = true
      AND sds.summary_date >= (SELECT today FROM cfg) - 30
  ),
  a_hoje AS (SELECT COUNT(DISTINCT product_id)::int AS n FROM cenario_a WHERE summary_date = (SELECT today FROM cfg)),
  a_7d   AS (SELECT COUNT(DISTINCT product_id)::int AS n FROM cenario_a WHERE summary_date >= (SELECT today FROM cfg) - 7),
  a_15d  AS (SELECT COUNT(DISTINCT product_id)::int AS n FROM cenario_a WHERE summary_date >= (SELECT today FROM cfg) - 15),
  a_30d  AS (SELECT COUNT(DISTINCT product_id)::int AS n FROM cenario_a),
  a_expiring AS (SELECT COUNT(DISTINCT product_id)::int AS n FROM cenario_a WHERE summary_date <= (SELECT today FROM cfg) - 23),
  b_7d   AS (SELECT COUNT(DISTINCT product_id)::int AS n FROM cenario_b WHERE summary_date >= (SELECT today FROM cfg) - 7),
  b_30d  AS (SELECT COUNT(DISTINCT product_id)::int AS n FROM cenario_b),
  top_a AS (
    SELECT s.name, COUNT(DISTINCT ca.product_id)::int AS cnt
    FROM cenario_a ca
    JOIN suppliers s ON s.id = ca.supplier_id
    WHERE s.name IS NOT NULL
    GROUP BY s.name ORDER BY cnt DESC LIMIT 1
  ),
  ativas AS (
    SELECT
      COUNT(*)::int                                             AS total_var,
      COUNT(*) FILTER (WHERE has_incoming_stock  = true)::int  AS incoming,
      COUNT(*) FILTER (WHERE has_upcoming_restock = true)::int AS upcoming
    FROM vw_product_availability
  )
  SELECT jsonb_build_object(
    'restockedToday',           (SELECT n FROM a_hoje),
    'restockedThisWeek',        (SELECT n FROM a_7d),
    'restockedLast15Days',      (SELECT n FROM a_15d),
    'restockedLast30Days',      (SELECT n FROM a_30d),
    'expiringSoon',             (SELECT n FROM a_expiring),
    'topSupplierName',          COALESCE((SELECT name FROM top_a), null),
    'topSupplierCount',         COALESCE((SELECT cnt  FROM top_a), 0),
    'activeReplenishments',     (SELECT incoming FROM ativas),
    'totalVariants',            (SELECT total_var FROM ativas),
    'replenishmentRate',        ROUND((SELECT incoming::numeric FROM ativas) / NULLIF((SELECT total_var FROM ativas), 0) * 100),
    'reorderedThisWeek',        (SELECT n FROM b_7d),
    'reorderedThisMonth',       (SELECT n FROM b_30d),
    'upcomingRestockVariants',  (SELECT upcoming FROM ativas),
    '_version',                 'v5_fixes_20260619'
  );
$function$
