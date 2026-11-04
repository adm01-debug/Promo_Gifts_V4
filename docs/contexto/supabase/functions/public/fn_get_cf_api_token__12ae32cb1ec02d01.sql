CREATE OR REPLACE FUNCTION public.fn_get_cf_api_token()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CF_API_TOKEN' LIMIT 1;
$function$
