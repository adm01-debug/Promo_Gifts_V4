CREATE OR REPLACE FUNCTION public.fn_get_asia_secret_key()
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
  SELECT decrypted_secret FROM vault.decrypted_secrets
  WHERE name = 'asia_secret_key' LIMIT 1;
$function$
