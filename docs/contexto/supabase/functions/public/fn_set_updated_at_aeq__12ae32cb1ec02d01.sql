CREATE OR REPLACE FUNCTION public.fn_set_updated_at_aeq()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$
