CREATE OR REPLACE FUNCTION public.clear_auth_attempts(_email text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  -- MIGRADO em 2026-06-15: era DELETE em auth_login_attempts (vazia).
  -- Agora limpa login_attempts (canônica).
  DELETE FROM public.login_attempts WHERE email = _email;
$function$
