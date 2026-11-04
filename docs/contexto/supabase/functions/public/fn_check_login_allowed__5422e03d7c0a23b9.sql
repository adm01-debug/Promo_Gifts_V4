CREATE OR REPLACE FUNCTION public.fn_check_login_allowed(p_email text, p_ip_address text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text)
 RETURNS TABLE(allowed boolean, reason text, blocked_until timestamp with time zone, check_details jsonb)
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

  -- P1 fix v3 (mantido): ip_whitelist_enabled=true + p_ip_address IS NULL → bloquear.
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

  -- P1 fix v2 (mantido): city_whitelist_enabled=true + p_city IS NULL → bloquear.
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

  -- Onda 5 C1 — contagem por PAR (email, ip):
  --   · _last_success exige verified=true — só a edge produz essa linha
  --     quando success chega com o JWT recém-emitido do próprio usuário;
  --     um POST anônimo não consegue forjar verified (insert usa
  --     service_role mas a flag é decidida no código da edge, não no
  --     body). Sucesso forjado já não zera o contador.
  --   · Falhas contam só no par (email, ip do caller). Envenenar
  --     login_attempts com falhas de outro IP tranca apenas
  --     (email, ip-do-atacante) — não a conta do usuário real.
  --   · p_ip_address NULL (caller legado sem contexto de IP) mantém a
  --     contagem por e-mail inteiro — comportamento anterior.
  SELECT max(created_at) INTO _last_success
  FROM public.login_attempts
  WHERE lower(email) = p_email
    AND success = true
    AND verified = true
    AND (p_ip_address IS NULL OR ip_address = p_ip_address);

  SELECT count(*), max(created_at)
    INTO _failed_count, _last_failure
  FROM public.login_attempts
  WHERE lower(email) = p_email
    AND success = false
    AND created_at > now()
        - (_s.lockout_duration_minutes || ' minutes')::interval
    AND (p_ip_address IS NULL OR ip_address = p_ip_address)
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
$function$
