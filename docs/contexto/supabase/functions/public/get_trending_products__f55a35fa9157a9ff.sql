CREATE OR REPLACE FUNCTION public.get_trending_products(p_limit integer DEFAULT 10, p_days integer DEFAULT 7, p_category_slug character varying DEFAULT NULL::character varying)
 RETURNS TABLE(id uuid, sku character varying, name character varying, slug character varying, primary_image text, min_price numeric, total_views bigint, recent_views bigint, trend_score numeric, stock_available integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
WITH product_prices AS (
  -- Cadeia de preço segura: VSS tier1 → sale_price → suggested_price → 0
  SELECT
    p.id AS product_id,
    COALESCE(
      NULLIF(MIN(vss.cost_price_1), 0),
      NULLIF(p.sale_price, 0),
      NULLIF(p.suggested_price, 0),
      0
    ) AS min_price
  FROM products p
  LEFT JOIN product_variants pv  ON pv.product_id = p.id  AND pv.is_active = true
  LEFT JOIN variant_supplier_sources vss ON vss.variant_id = pv.id AND vss.is_active = true
  WHERE p.is_active = true AND p.deleted_at IS NULL
  GROUP BY p.id, p.sale_price, p.suggested_price
),
product_stock AS (
  SELECT
    pv.product_id,
    COALESCE(SUM(pv.stock_quantity), 0)::integer AS stock_available
  FROM product_variants pv
  GROUP BY pv.product_id
),
product_view_stats AS (
  SELECT
    pviews.product_id::uuid   AS product_id,
    COUNT(*)                  AS total_views,
    COUNT(*) FILTER(
      WHERE pviews.created_at >= NOW() - (p_days || ' days')::interval
    )                         AS recent_views,
    COUNT(*) FILTER(
      WHERE pviews.created_at >= NOW() - (p_days * 2 || ' days')::interval
        AND pviews.created_at <  NOW() - (p_days || ' days')::interval
    )                         AS prev_views
  FROM product_views pviews
  GROUP BY pviews.product_id
)
SELECT
  p.id,
  p.sku::varchar,
  p.name::varchar,
  p.slug::varchar,
  p.primary_image_url AS primary_image,
  COALESCE(pp.min_price, 0)                               AS min_price,
  COALESCE(pvs.total_views, 0)::bigint                    AS total_views,
  COALESCE(pvs.recent_views, 0)::bigint                   AS recent_views,
  -- Trend Score: 1.5× recent + 0.5× previous window
  (COALESCE(pvs.recent_views, 0) * 1.5 +
   COALESCE(pvs.prev_views,   0) * 0.5)::numeric          AS trend_score,
  COALESCE(ps.stock_available, 0)                         AS stock_available
FROM products p
JOIN product_prices pp ON pp.product_id = p.id
LEFT JOIN product_stock ps      ON ps.product_id = p.id
LEFT JOIN product_view_stats pvs ON pvs.product_id = p.id
WHERE
  p.is_active  = true
  AND p.deleted_at IS NULL
  AND (
    p_category_slug IS NULL
    OR EXISTS (
      SELECT 1
      FROM product_category_assignments pca
      JOIN categories c ON c.id = pca.category_id
      WHERE pca.product_id = p.id AND c.slug = p_category_slug
    )
  )
ORDER BY trend_score DESC, recent_views DESC
LIMIT p_limit;
$function$
