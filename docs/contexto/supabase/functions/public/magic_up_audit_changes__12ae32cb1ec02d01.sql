CREATE OR REPLACE FUNCTION public.magic_up_audit_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ BEGIN RETURN NEW; END; $function$
