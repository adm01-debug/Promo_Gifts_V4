-- Auditoria R4 — SEC-007 corretiva
-- Aplicado em produção (doufsxqlfjyuvxuezpln) em 2026-09-04
--
-- Copilot review #1829: EXCEPTION WHEN OTHERS retornava SQLERRM para callers
-- via RPC — vazamento de mensagens internas para anon/authenticated.
-- Fix: remover campo 'error' do jsonb de retorno do handler de exceção.

CREATE OR REPLACE FUNCTION public.check_login_rate_limit(
  _email text,
  _ip text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _max_failures int := 5;
  _window_minutes int := 15;
  _lockout_minutes int := 5;
  _failed_count int := 0;
  _last_failure timestamptz;
  _last_success timestamptz;
  _lockout_until timestamptz;
BEGIN
  IF _email IS NULL OR length(trim(_email)) = 0 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'invalid_email',
      'remaining_seconds', 0
    );
  END IF;

  _email := lower(trim(_email));

  SELECT max(created_at) INTO _last_success
  FROM public.login_attempts
  WHERE email = _email AND success = true;

  SELECT count(*), max(created_at)
    INTO _failed_count, _last_failure
  FROM public.login_attempts
  WHERE email = _email
    AND success = false
    AND created_at > now() - (_window_minutes || ' minutes')::interval
    AND (_last_success IS NULL OR created_at > _last_success);

  IF _failed_count >= _max_failures THEN
    _lockout_until := _last_failure + (_lockout_minutes || ' minutes')::interval;
    IF _lockout_until > now() THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'rate_limited_email',
        'failed_count', _failed_count,
        'remaining_seconds', ceil(extract(epoch FROM (_lockout_until - now())))::int,
        'lockout_until', _lockout_until
      );
    END IF;
  END IF;

  IF _ip IS NOT NULL AND length(trim(_ip)) > 0 AND _ip <> 'unknown' AND _ip <> 'client' THEN
    SELECT count(*), max(created_at)
      INTO _failed_count, _last_failure
    FROM public.login_attempts
    WHERE ip_address = _ip
      AND success = false
      AND created_at > now() - (_window_minutes || ' minutes')::interval;

    IF _failed_count >= 20 THEN
      _lockout_until := _last_failure + (_lockout_minutes || ' minutes')::interval;
      IF _lockout_until > now() THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'rate_limited_ip',
          'failed_count', _failed_count,
          'remaining_seconds', ceil(extract(epoch FROM (_lockout_until - now())))::int,
          'lockout_until', _lockout_until
        );
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'failed_count', _failed_count,
    'remaining_seconds', 0
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'allowed', false,
    'reason', 'rate_limit_check_error',
    'remaining_seconds', 0
  );
END;
$$;

-- Validação: confirmar que SQLERRM não está mais no body da função
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'check_login_rate_limit'
      AND pronamespace = 'public'::regnamespace
      AND pg_get_functiondef(oid) LIKE '%SQLERRM%'
  ) THEN
    RAISE EXCEPTION 'SEC-007-fix: check_login_rate_limit ainda expõe SQLERRM!';
  END IF;
  RAISE NOTICE '✓ [SEC-007-fix] check_login_rate_limit: SQLERRM removido do handler de exceção.';
END;
$$;
