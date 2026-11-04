CREATE OR REPLACE FUNCTION public.check_auth_throttling(_email text, _ip text)
 RETURNS TABLE(allowed boolean, remaining_seconds integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  recent_failures     INT;
  last_failure_at     TIMESTAMP WITH TIME ZONE;
  lockout_duration    INT;
  elapsed_since_last  INT;
BEGIN
  -- MIGRADO em 2026-06-15: era auth_login_attempts (0 linhas).
  -- Agora lê de login_attempts (canônica). Lógica de throttling idêntica.
  SELECT COUNT(*), MAX(created_at)
    INTO recent_failures, last_failure_at
  FROM public.login_attempts
  WHERE (email = _email OR ip_address = _ip)
    AND success = false
    AND created_at > now() - INTERVAL '15 minutes';

  IF recent_failures < 5 THEN
    RETURN QUERY SELECT true, 0;
    RETURN;
  END IF;

  IF    recent_failures < 10 THEN lockout_duration := 300;
  ELSIF recent_failures < 15 THEN lockout_duration := 900;
  ELSE                             lockout_duration := 3600;
  END IF;

  elapsed_since_last := EXTRACT(EPOCH FROM (now() - last_failure_at))::INT;

  IF elapsed_since_last >= lockout_duration THEN
    RETURN QUERY SELECT true, 0;
  ELSE
    RETURN QUERY SELECT false, (lockout_duration - elapsed_since_last);
  END IF;
END;
$function$
