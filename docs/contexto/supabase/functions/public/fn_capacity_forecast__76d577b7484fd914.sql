CREATE OR REPLACE FUNCTION public.fn_capacity_forecast(p_days_ahead integer DEFAULT 90)
 RETURNS TABLE(metric text, current_value bigint, growth_per_day numeric, projected_value bigint, projection_date date, status text)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_products_growth numeric;
  v_variants_growth numeric;
  v_images_growth numeric;
  v_snapshots_growth numeric;
  v_db_size bigint;
BEGIN
  SELECT COALESCE(COUNT(*) FILTER (WHERE created_at > now() - interval '30 days')::numeric / 30, 0)
    INTO v_products_growth FROM products;
  SELECT COALESCE(COUNT(*) FILTER (WHERE created_at > now() - interval '30 days')::numeric / 30, 0)
    INTO v_variants_growth FROM product_variants;
  SELECT COALESCE(COUNT(*) FILTER (WHERE created_at > now() - interval '30 days')::numeric / 30, 0)
    INTO v_images_growth FROM product_images;
  SELECT COALESCE(COUNT(*) FILTER (WHERE captured_at > now() - interval '7 days')::numeric / 7, 0)
    INTO v_snapshots_growth FROM stock_snapshots;
  SELECT pg_database_size(current_database()) INTO v_db_size;

  RETURN QUERY SELECT 'products'::text, (SELECT COUNT(*) FROM products)::bigint, v_products_growth,
    ((SELECT COUNT(*) FROM products) + (v_products_growth * p_days_ahead))::bigint,
    (CURRENT_DATE + (p_days_ahead || ' days')::interval)::date,
    CASE WHEN (SELECT COUNT(*) FROM products) + (v_products_growth * p_days_ahead) > 100000 
      THEN '⚠️ Considere particionamento' ELSE '✅ OK' END;

  RETURN QUERY SELECT 'product_variants'::text, (SELECT COUNT(*) FROM product_variants)::bigint, v_variants_growth,
    ((SELECT COUNT(*) FROM product_variants) + (v_variants_growth * p_days_ahead))::bigint,
    (CURRENT_DATE + (p_days_ahead || ' days')::interval)::date,
    CASE WHEN (SELECT COUNT(*) FROM product_variants) + (v_variants_growth * p_days_ahead) > 500000 
      THEN '⚠️ Considere particionamento' ELSE '✅ OK' END;

  RETURN QUERY SELECT 'product_images'::text, (SELECT COUNT(*) FROM product_images)::bigint, v_images_growth,
    ((SELECT COUNT(*) FROM product_images) + (v_images_growth * p_days_ahead))::bigint,
    (CURRENT_DATE + (p_days_ahead || ' days')::interval)::date,
    CASE WHEN (SELECT COUNT(*) FROM product_images) + (v_images_growth * p_days_ahead) > 1000000 
      THEN '⚠️ Considere particionamento' ELSE '✅ OK' END;

  RETURN QUERY SELECT 'stock_snapshots'::text, (SELECT COUNT(*) FROM stock_snapshots)::bigint, v_snapshots_growth,
    ((SELECT COUNT(*) FROM stock_snapshots) + (v_snapshots_growth * p_days_ahead))::bigint,
    (CURRENT_DATE + (p_days_ahead || ' days')::interval)::date,
    CASE WHEN v_snapshots_growth > 1000 
      THEN '💡 Purge 14d já ativo via cron' ELSE '✅ OK' END;

  RETURN QUERY SELECT 'database_size_mb'::text, (v_db_size / 1024 / 1024)::bigint, 0.0::numeric, 0::bigint,
    CURRENT_DATE, '💾 ' || pg_size_pretty(v_db_size);
END;
$function$
