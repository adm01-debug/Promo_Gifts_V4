CREATE OR REPLACE FUNCTION public.fn_get_cf_account_id()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CF_ACCOUNT_ID' LIMIT 1;
$function$
