CREATE OR REPLACE FUNCTION public.fn_validate_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ BEGIN RETURN NEW; END; $function$
