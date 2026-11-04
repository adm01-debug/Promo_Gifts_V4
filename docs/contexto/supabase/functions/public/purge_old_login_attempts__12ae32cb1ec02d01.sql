CREATE OR REPLACE FUNCTION public.purge_old_login_attempts()
 RETURNS integer
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$ SELECT public.cleanup_old_login_attempts(); $function$
