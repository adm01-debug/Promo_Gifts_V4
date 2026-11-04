CREATE OR REPLACE FUNCTION public.purge_old_rate_limits()
 RETURNS integer
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$ SELECT public.clean_old_rate_limits(); $function$
