CREATE OR REPLACE FUNCTION public.purge_expired_step_up_artifacts()
 RETURNS integer
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$ SELECT public.cleanup_orphan_step_up_artifacts() + public.cleanup_expired_step_up_tokens(); $function$
