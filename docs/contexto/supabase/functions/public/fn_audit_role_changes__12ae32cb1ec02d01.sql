CREATE OR REPLACE FUNCTION public.fn_audit_role_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ BEGIN RETURN COALESCE(NEW, OLD); END; $function$
