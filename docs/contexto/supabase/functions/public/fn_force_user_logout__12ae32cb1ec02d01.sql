CREATE OR REPLACE FUNCTION public.fn_force_user_logout()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ BEGIN RETURN NEW; END; $function$
