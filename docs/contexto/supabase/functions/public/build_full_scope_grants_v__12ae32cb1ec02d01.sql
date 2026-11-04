CREATE OR REPLACE FUNCTION public.build_full_scope_grants_v()
 RETURNS void
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$ SELECT 1; $function$
