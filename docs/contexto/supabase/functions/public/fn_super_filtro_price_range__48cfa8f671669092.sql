CREATE OR REPLACE FUNCTION public.fn_super_filtro_price_range(p_brands text[] DEFAULT NULL::text[], p_category_slug text DEFAULT NULL::text, p_target_audiences text[] DEFAULT NULL::text[], p_is_textil boolean DEFAULT NULL::boolean, p_is_thermal boolean DEFAULT NULL::boolean, p_only_in_stock boolean DEFAULT false)
 RETURNS TABLE(price_min numeric, price_max numeric, price_p25 numeric, price_p75 numeric, price_median numeric, price_avg numeric, total_with_price bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  SELECT
    MIN(p.sale_price) FILTER (WHERE p.sale_price >= 1)::numeric              AS price_min,
    MAX(p.sale_price)::numeric                                                AS price_max,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY p.sale_price)::numeric      AS price_p25,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY p.sale_price)::numeric      AS price_p75,
    PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY p.sale_price)::numeric      AS price_median,
    ROUND(AVG(p.sale_price), 2)::numeric                                     AS price_avg,
    COUNT(*)                                                                  AS total_with_price
  FROM products p
  LEFT JOIN product_category_assignments pca ON pca.product_id = p.id AND pca.is_primary = true
  LEFT JOIN categories c ON c.id = pca.category_id
  WHERE p.is_active = true
    AND p.is_deleted IS NOT TRUE
    AND p.sale_price IS NOT NULL AND p.sale_price > 0
    AND (p_brands IS NULL OR p.brand = ANY(p_brands))
    AND (p_category_slug IS NULL OR c.slug = p_category_slug)
    AND (p_target_audiences IS NULL OR p.target_audience && p_target_audiences)
    AND (p_is_textil IS NULL OR p.is_textil = p_is_textil)
    AND (p_is_thermal IS NULL OR p.is_thermal = p_is_thermal)
    AND (NOT p_only_in_stock OR p.is_stockout = false);
$function$
