-- Auditoria R4 — SEC-007 + SEC-008
-- Aplicado em produção (doufsxqlfjyuvxuezpln) em 2026-09-04
--
-- SEC-007: check_login_rate_limit — remover pg_temp do search_path
--   SECURITY DEFINER com pg_temp no search_path permite injeção de
--   objetos temporários que sombream tabelas/funções reais.
--   Risco: escalada de privilégio via tabela temp homônima a login_attempts.
--
-- SEC-008: fn_check_login_allowed — fail-open → fail-closed
--   O handler EXCEPTION retornava allowed=true em caso de erro de BD,
--   permitindo bypass total do gate de login. Corrigido para fail-closed.

-- ────────────────────────────────────────────────────────────────────────────
-- SEC-007: check_login_rate_limit — search_path sem pg_temp
-- Reprodução completa da função (body idêntico, só remove pg_temp do header)
-- ────────────────────────────────────────────────────────────────────────────
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
  -- Sanitiza input
  IF _email IS NULL OR length(trim(_email)) = 0 THEN
    -- Fail-CLOSED em input inválido (Onda 20)
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'invalid_email',
      'remaining_seconds', 0
    );
  END IF;

  _email := lower(trim(_email));

  -- Último sucesso por este email (delimita janela de falhas)
  SELECT max(created_at) INTO _last_success
  FROM public.login_attempts
  WHERE email = _email AND success = true;

  -- Conta falhas POR EMAIL na janela, ignorando as anteriores ao último sucesso
  SELECT count(*), max(created_at)
    INTO _failed_count, _last_failure
  FROM public.login_attempts
  WHERE email = _email
    AND success = false
    AND created_at > now() - (_window_minutes || ' minutes')::interval
    AND (_last_success IS NULL OR created_at > _last_success);

  -- Se atingiu o limite por EMAIL → lockout 5 min após última falha
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

  -- Adicional: se _ip fornecido, verifica também por IP (mais agressivo: 20 falhas / 15min)
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
  -- SEC-007: Fail-CLOSED em erro (sem pg_temp no search_path)
  RETURN jsonb_build_object(
    'allowed', false,
    'reason', 'rate_limit_check_error',
    'error', SQLERRM,
    'remaining_seconds', 0
  );
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- SEC-008: fn_check_login_allowed — fail-open → fail-closed
-- Função criada diretamente em BD (sem migration de criação no git).
-- Fix aplicado in-DB em 2026-09-04: EXCEPTION handler alterado de
--   RETURN QUERY SELECT true, 'security_check_error_fail_open'::TEXT, ...
-- para:
--   RETURN QUERY SELECT false, 'security_check_error_fail_closed'::TEXT, ...
--
-- Validação pós-fix (executada in-DB):
--   SELECT (pg_get_functiondef(oid) LIKE '%fail_closed%')
--   FROM pg_proc WHERE proname = 'fn_check_login_allowed'
--   AND pronamespace = 'public'::regnamespace;
--   → TRUE ✅
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Verifica que o fix fail-closed está em vigor; levanta exceção se não estiver.
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'fn_check_login_allowed'
      AND pronamespace = 'public'::regnamespace
      AND pg_get_functiondef(oid) LIKE '%fail_open%'
  ) THEN
    RAISE EXCEPTION 'SEC-008: fn_check_login_allowed ainda tem handler fail-open! Fix não aplicado.';
  END IF;
END;
$$;
