-- Auditoria R4 — SEC-008 corretiva v3 (cubic-dev-ai #1829 P1)
-- Aplicado em produção (doufsxqlfjyuvxuezpln) em 2026-09-04
--
-- cubic P1 (20260904120000 linha 75): ip bypass quando p_ip_address IS NULL.
--   Quando ip_whitelist_enabled=true e p_ip_address IS NULL, a condição
--   `AND p_ip_address IS NOT NULL` saltava o check silenciosamente → bypass.
--   Mesma raiz do city bypass (P1 anterior). Fix: bloquear com ip_unknown_blocked.

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

  -- P1 fix v3: ip_whitelist_enabled=true + p_ip_address IS NULL → bloquear.
  -- A versão anterior (condição AND p_ip_address IS NOT NULL) saltava silenciosamente → bypass.
  IF _s.ip_whitelist_enabled THEN
    IF p_ip_address IS NULL THEN
      _details := _details || '{"ip_check":"blocked_null_ip"}'::JSONB;
      BEGIN
        INSERT INTO public.access_blocked_log
          (email, ip_address, city, block_reason, user_agent)
        VALUES (p_email, 'unknown', p_city, 'ip_unknown_blocked', p_user_agent);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
      RETURN QUERY SELECT false, 'ip_unknown_blocked'::TEXT,
        NULL::TIMESTAMPTZ, _details;
      RETURN;
    END IF;
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

  -- P1 fix v2 (mantido de 20260904120000): city_whitelist_enabled=true + p_city IS NULL → bloquear.
  IF _s.city_whitelist_enabled THEN
    IF p_city IS NULL THEN
      _details := _details || '{"city_check":"blocked_null_city"}'::JSONB;
      BEGIN
        INSERT INTO public.access_blocked_log
          (email, ip_address, city, block_reason, user_agent)
        VALUES (p_email, _ip_safe, NULL, 'city_unknown_blocked', p_user_agent);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
      RETURN QUERY SELECT false, 'city_unknown_blocked'::TEXT,
        NULL::TIMESTAMPTZ, _details;
      RETURN;
    END IF;
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
  -- SEC-008: fail-closed. Retorna genérico sem vazar mensagem interna.
  RETURN QUERY SELECT false, 'security_check_error_fail_closed'::TEXT,
    NULL::TIMESTAMPTZ, '{}'::JSONB;
END;
$function$;

-- GRANTs mantidos (de 20260904120000)
REVOKE EXECUTE ON FUNCTION public.fn_check_login_allowed(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_check_login_allowed(text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_check_login_allowed(text, text, text, text) TO authenticated;

-- Validação
DO $$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO v_def
  FROM pg_proc
  WHERE proname = 'fn_check_login_allowed'
    AND pronamespace = 'public'::regnamespace;

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'SEC-008v3: fn_check_login_allowed não existe após CREATE OR REPLACE!';
  END IF;

  IF v_def NOT LIKE '%security_check_error_fail_closed%' THEN
    RAISE EXCEPTION 'SEC-008v3: fn_check_login_allowed não tem handler fail-closed!';
  END IF;

  IF v_def NOT LIKE '%city_unknown_blocked%' THEN
    RAISE EXCEPTION 'SEC-008v3: fn_check_login_allowed não tem fix de city bypass!';
  END IF;

  IF v_def NOT LIKE '%ip_unknown_blocked%' THEN
    RAISE EXCEPTION 'SEC-008v3: fn_check_login_allowed não tem fix de ip bypass!';
  END IF;

  IF NOT has_function_privilege('anon', 'public.fn_check_login_allowed(text,text,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'SEC-008v3: anon não tem EXECUTE em fn_check_login_allowed!';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.fn_check_login_allowed(text,text,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'SEC-008v3: authenticated não tem EXECUTE em fn_check_login_allowed!';
  END IF;

  RAISE NOTICE '✓ [SEC-008v3] fn_check_login_allowed: ip bypass + city bypass corrigidos, GRANTs presentes.';
END;
$$;
