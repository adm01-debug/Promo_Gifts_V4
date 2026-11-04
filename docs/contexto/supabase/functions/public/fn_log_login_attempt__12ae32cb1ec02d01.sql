CREATE OR REPLACE FUNCTION public.fn_log_login_attempt()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ BEGIN RETURN NEW; END; $function$
