CREATE OR REPLACE FUNCTION public.fn_update_ptm_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$function$
