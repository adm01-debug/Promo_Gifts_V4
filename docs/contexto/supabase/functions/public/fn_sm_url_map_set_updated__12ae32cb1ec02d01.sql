CREATE OR REPLACE FUNCTION public.fn_sm_url_map_set_updated()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$
