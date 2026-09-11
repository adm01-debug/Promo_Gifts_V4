
-- ============================================================
-- FIX: fn_check_login_allowed — ip_address NOT NULL em
-- access_blocked_log causava INSERT silencioso falho quando
-- p_ip_address = NULL. Aplicar COALESCE('unknown').
-- Descoberto em teste exaustivo C6 (2026-06-15).
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_check_login_allowed(
  p_email       TEXT,
  p_ip_address  TEXT       DEFAULT NULL,
  p_city        TEXT       DEFAULT NULL,
  p_user_agent  TEXT       DEFAULT NULL
)
RETURNS TABLE (
  allowed       BOOLEAN,
  reason        TEXT,
  blocked_until TIMESTAMPTZ,
  check_details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _s              RECORD;
  _failed_count   INT   := 0;
  _last_failure   TIMESTAMPTZ;
  _last_success   TIMESTAMPTZ;
  _lockout_until  TIMESTAMPTZ;
  _details        JSONB := '{}'::JSONB;
  _ip_safe        TEXT; -- ip_address nunca NULL para INSERT (NOT NULL constraint)
BEGIN
  -- ip seguro para INSERT em access_blocked_log (NOT NULL)
  _ip_safe := COALESCE(p_ip_address, 'unknown');

  -- ── GUARD: email obrigatório ───────────────────────────────
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN QUERY SELECT false, 'invalid_email'::TEXT,
      NULL::TIMESTAMPTZ, '{}'::JSONB;
    RETURN;
  END IF;
  p_email := lower(trim(p_email));

  -- ── 1. Ler configurações (com fallback seguro se singleton vazio) ──
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

  -- ── 2. IP Whitelist ───────────────────────────────────────
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

  -- ── 3. City Whitelist ─────────────────────────────────────
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

  -- ── 4. Lockout por tentativas falhas ──────────────────────
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

  -- ── 5. Passou tudo → ALLOWED ──────────────────────────────
  _details := _details || '{"result":"all_checks_passed"}'::JSONB;
  RETURN QUERY SELECT true, 'allowed'::TEXT, NULL::TIMESTAMPTZ, _details;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT true, 'security_check_error_fail_open'::TEXT,
    NULL::TIMESTAMPTZ,
    jsonb_build_object('error', SQLERRM, 'sqlstate', SQLSTATE);
END;
$function$;
;
