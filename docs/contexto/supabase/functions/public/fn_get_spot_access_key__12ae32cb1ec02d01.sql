CREATE OR REPLACE FUNCTION public.fn_get_spot_access_key()
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'vault', 'public'
AS $function$
  select decrypted_secret from vault.decrypted_secrets where name = 'SPOT_ACCESS_KEY' limit 1;
$function$
