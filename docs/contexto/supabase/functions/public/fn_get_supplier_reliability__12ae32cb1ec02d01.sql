CREATE OR REPLACE FUNCTION public.fn_get_supplier_reliability()
 RETURNS SETOF mv_supplier_reliability
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'pg_temp'
AS $function$
  SELECT * FROM public.mv_supplier_reliability
  WHERE public.is_supervisor_or_above((SELECT auth.uid()))
$function$
