CREATE OR REPLACE FUNCTION public.fn_get_rupture_alerts()
 RETURNS SETOF mv_stock_rupture_alert
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'pg_temp'
AS $function$
  SELECT * FROM public.mv_stock_rupture_alert
  WHERE public.is_supervisor_or_above((SELECT auth.uid()))
$function$
