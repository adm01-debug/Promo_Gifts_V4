CREATE OR REPLACE FUNCTION public.fn_get_sm_session_cookie()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE name = 'sm_session_cookie'
  LIMIT 1;
$function$
