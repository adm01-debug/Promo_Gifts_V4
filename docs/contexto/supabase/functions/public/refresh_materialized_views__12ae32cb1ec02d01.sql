CREATE OR REPLACE FUNCTION public.refresh_materialized_views()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'analytics'
AS $function$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_material_group_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_product_compositions;
    RAISE NOTICE 'Materialized views refreshed at %', NOW();
END;
$function$
