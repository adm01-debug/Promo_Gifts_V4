CREATE OR REPLACE FUNCTION public.refresh_full_scope_grants_view()
 RETURNS void
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$ SELECT 1; $function$
