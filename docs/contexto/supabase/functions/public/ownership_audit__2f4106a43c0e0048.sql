CREATE OR REPLACE FUNCTION public.ownership_audit(_triggered_by text DEFAULT 'manual'::text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$ SELECT public.audit_ownership_orphans(_triggered_by); $function$
