-- Auditoria R4 — SEC-008 corretiva (coderabbitai #1829)
-- Aplicado em produção (doufsxqlfjyuvxuezpln) em 2026-09-04
--
-- CodeRabbit finding: migration 20260904101500 só validava fn_check_login_allowed
-- com DO $$ — se a função não existisse em um banco recriado pelas migrations, o
-- bloco passava silenciosamente e o gate de login retornava allowed:true (bypass).
--
-- Fix duplo:
--   1. CREATE OR REPLACE com body canônico (fail-closed, sem SQLERRM/SQLSTATE
--      no retorno para callers anon/authenticated — SEC-007-class).
--   2. DO $$ de validação reforçado: verifica existência + fail-closed + sem SQLERRM.

CREATE OR REPLACE FUNCTION public.fn_check_login_allowed(
  p_email       text,
  p_ip_address  text    DEFAULT NULL,
  p_city        text    DEFAULT NULL,
  p_user_agent  text    DEFAULT NULL
)
RETURNS TABLE(
  allowed       boolean,
  reason        text,
  blocked_until timestamptz,
  check_details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _s              RECORD;
  _failed_count   INT   := 0;
  _last_failure   TIMESTAMPTZ;
  _last_success   TIMESTAMPTZ;
  _lockout_until  TIMESTAMPTZ;
  _details        JSONB := '{}'::JSONB;
  _ip_safe        TEXT;
BEGIN
  _ip_safe := COALESCE(p_ip_address, 'unknown');

  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN QUERY SELECT false, 'invalid_email'::TEXT,
      NULL::TIMESTAMPTZ, '{}'::JSONB;
    RETURN;
  END IF;
  p_email := lower(trim(p_email));

  SELECT * INTO _s FROM public.access_security_settings LIMIT 1;
  IF NOT FOUND THEN
    _s.ip_whitelist_enabled     := false;
    _s.city_whitelist_enabled   := false;
    _s.block_unknown_locations  := false;
    _s.max_failed_attempts      := 5;
    _s.lockout_duration_minutes := 30;
    _s.strict_access_mode       := false;
    _details := _details || '{"settings_source":"defaults"}'::JSONB;
  ELSE
    _details := _details || '{"settings_source":"db"}'::JSONB;
  END IF;

  _s.max_failed_attempts      := GREATEST(COALESCE(_s.max_failed_attempts, 5), 1);
  _s.lockout_duration_minutes := GREATEST(COALESCE(_s.lockout_duration_minutes, 30), 1);

  IF _s.ip_whitelist_enabled AND p_ip_address IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.ip_whitelist WHERE is_active = true LIMIT 1) THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.ip_whitelist
        WHERE ip_address = p_ip_address AND is_active = true
      ) THEN
        _details := _details
          || jsonb_build_object('ip_check','blocked','ip',p_ip_address);
        BEGIN
          INSERT INTO public.access_blocked_log
            (email, ip_address, city, block_reason, user_agent)
          VALUES (p_email, _ip_safe, p_city, 'ip_not_whitelisted', p_user_agent);
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        RETURN QUERY SELECT false, 'ip_not_whitelisted'::TEXT,
          NULL::TIMESTAMPTZ, _details;
        RETURN;
      END IF;
      _details := _details || '{"ip_check":"allowed"}'::JSONB;
    ELSE
      _details := _details || '{"ip_check":"skipped_empty_whitelist"}'::JSONB;
    END IF;
  ELSE
    _details := _details || '{"ip_check":"disabled"}'::JSONB;
  END IF;

  IF _s.city_whitelist_enabled AND p_city IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.city_whitelist WHERE is_active = true LIMIT 1) THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.city_whitelist
        WHERE upper(city_name) = upper(p_city) AND is_active = true
      ) THEN
        _details := _details
          || jsonb_build_object('city_check','blocked','city',p_city);
        BEGIN
          INSERT INTO public.access_blocked_log
            (email, ip_address, city, block_reason, user_agent)
          VALUES (p_email, _ip_safe, p_city, 'city_not_whitelisted', p_user_agent);
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        RETURN QUERY SELECT false, 'city_not_whitelisted'::TEXT,
          NULL::TIMESTAMPTZ, _details;
        RETURN;
      END IF;
      _details := _details || '{"city_check":"allowed"}'::JSONB;
    ELSE
      _details := _details || '{"city_check":"skipped_empty_whitelist"}'::JSONB;
    END IF;
  ELSE
    _details := _details || '{"city_check":"disabled"}'::JSONB;
  END IF;

  SELECT max(created_at) INTO _last_success
  FROM public.login_attempts
  WHERE email = p_email AND success = true;

  SELECT count(*), max(created_at)
    INTO _failed_count, _last_failure
  FROM public.login_attempts
  WHERE email = p_email
    AND success = false
    AND created_at > now()
        - (_s.lockout_duration_minutes || ' minutes')::interval
    AND (_last_success IS NULL OR created_at > _last_success);

  _details := _details || jsonb_build_object(
    'failed_attempts',   _failed_count,
    'max_allowed',       _s.max_failed_attempts,
    'window_minutes',    _s.lockout_duration_minutes
  );

  IF _failed_count >= _s.max_failed_attempts AND _last_failure IS NOT NULL THEN
    _lockout_until := _last_failure
      + (_s.lockout_duration_minutes || ' minutes')::interval;
    IF _lockout_until > now() THEN
      _details := _details
        || jsonb_build_object('lockout_until', _lockout_until);
      BEGIN
        INSERT INTO public.access_blocked_log
          (email, ip_address, city, block_reason, user_agent)
        VALUES (p_email, _ip_safe, p_city,
                'too_many_failed_attempts', p_user_agent);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
      RETURN QUERY SELECT false, 'too_many_failed_attempts'::TEXT,
        _lockout_until, _details;
      RETURN;
    END IF;
  END IF;

  _details := _details || '{"result":"all_checks_passed"}'::JSONB;
  RETURN QUERY SELECT true, 'allowed'::TEXT, NULL::TIMESTAMPTZ, _details;

EXCEPTION WHEN OTHERS THEN
  -- SEC-008: fail-closed. Retorna generico sem vazar mensagem interna.
  RETURN QUERY SELECT false, 'security_check_error_fail_closed'::TEXT,
    NULL::TIMESTAMPTZ, '{}'::JSONB;
END;
$function$;

-- Validação reforçada: existência + fail-closed + sem SQLERRM no body
DO $$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO v_def
  FROM pg_proc
  WHERE proname = 'fn_check_login_allowed'
    AND pronamespace = 'public'::regnamespace;

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'SEC-008: fn_check_login_allowed não existe após CREATE OR REPLACE!';
  END IF;

  IF v_def NOT LIKE '%security_check_error_fail_closed%' THEN
    RAISE EXCEPTION 'SEC-008: fn_check_login_allowed não tem handler fail-closed!';
  END IF;

  IF v_def LIKE '%SQLERRM%' THEN
    RAISE EXCEPTION 'SEC-008: fn_check_login_allowed ainda expõe SQLERRM para callers!';
  END IF;

  RAISE NOTICE '✓ [SEC-008] fn_check_login_allowed: canônica, fail-closed, sem SQLERRM.';
END;
$$;
