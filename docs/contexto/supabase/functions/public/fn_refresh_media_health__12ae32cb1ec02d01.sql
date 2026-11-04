CREATE OR REPLACE FUNCTION public.fn_refresh_media_health()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'analytics'
AS $function$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_media_health;
END;
$function$
