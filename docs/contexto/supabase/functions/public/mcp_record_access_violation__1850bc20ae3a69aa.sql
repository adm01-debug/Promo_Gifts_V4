CREATE OR REPLACE FUNCTION public.mcp_record_access_violation(_key_id uuid, _reason text, _details jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$ SELECT public.mcp_audit_violation(_key_id, _reason, _details); $function$
