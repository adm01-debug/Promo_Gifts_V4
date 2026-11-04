CREATE OR REPLACE FUNCTION public.record_auth_attempt(_email text, _ip text, _success boolean, _reason text DEFAULT NULL::text, _ua text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  -- MIGRADO em 2026-06-15: era INSERT em auth_login_attempts (vazia).
  -- Agora delega para log_login_attempt → login_attempts (canônica, ativa).
  SELECT public.log_login_attempt(
    _email        := _email,
    _success      := _success,
    _user_id      := NULL,
    _ip           := _ip,
    _user_agent   := _ua,
    _failure_reason := _reason
  );
$function$
