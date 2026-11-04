CREATE OR REPLACE FUNCTION public.refresh_all_materialized_views()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'analytics'
 SET work_mem TO '64MB'
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
$function$
