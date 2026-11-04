CREATE OR REPLACE FUNCTION public.fn_update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$
