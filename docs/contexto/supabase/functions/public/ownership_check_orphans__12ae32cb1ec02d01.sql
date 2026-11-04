CREATE OR REPLACE FUNCTION public.ownership_check_orphans()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ SELECT (SELECT details FROM public.ownership_audit_reports ORDER BY generated_at DESC LIMIT 1); $function$
