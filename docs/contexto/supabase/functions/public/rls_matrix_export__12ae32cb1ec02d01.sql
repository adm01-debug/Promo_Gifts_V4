CREATE OR REPLACE FUNCTION public.rls_matrix_export()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$ SELECT public.audit_rls_matrix(); $function$
