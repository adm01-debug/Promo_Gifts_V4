CREATE OR REPLACE FUNCTION public.fn_get_cf_credentials()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'account_id', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CF_ACCOUNT_ID' LIMIT 1),
    'api_token',  (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CF_API_TOKEN'  LIMIT 1)
  );
$function$
