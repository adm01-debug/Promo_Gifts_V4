-- ============================================================================
-- LOTE F · MIGRATION 2/4 · funções de limpeza periódica (para pg_cron)
-- ============================================================================

-- 1) cleanup_security_logs: poda logs de segurança em 4 tabelas
CREATE OR REPLACE FUNCTION public.cleanup_security_logs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _token_failures_deleted int := 0;
  _bot_log_deleted int := 0;
  _audit_log_deleted int := 0;
  _ip_expired_deleted int := 0;
BEGIN
  WITH d AS (DELETE FROM public.public_token_failures WHERE created_at < now() - INTERVAL '90 days' RETURNING 1)
  SELECT count(*) INTO _token_failures_deleted FROM d;

  WITH d AS (DELETE FROM public.bot_detection_log WHERE created_at < now() - INTERVAL '90 days' RETURNING 1)
  SELECT count(*) INTO _bot_log_deleted FROM d;

  WITH d AS (DELETE FROM public.admin_audit_log WHERE created_at < now() - INTERVAL '365 days' RETURNING 1)
  SELECT count(*) INTO _audit_log_deleted FROM d;

  WITH d AS (
    DELETE FROM public.ip_access_control
    WHERE expires_at IS NOT NULL AND expires_at < now() - INTERVAL '30 days'
    RETURNING 1
  )
  SELECT count(*) INTO _ip_expired_deleted FROM d;

  RETURN jsonb_build_object(
    'ok', true,
    'ran_at', now(),
    'public_token_failures_deleted', _token_failures_deleted,
    'bot_detection_log_deleted', _bot_log_deleted,
    'admin_audit_log_deleted', _audit_log_deleted,
    'ip_access_control_expired_deleted', _ip_expired_deleted
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cleanup_security_logs() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.cleanup_security_logs() IS
  'Migrada do Lovable em 2026-05-22 (Lote F). Poda logs de seguranca. Agendar pg_cron diario.';

-- 2) purge_expired_security_data: limpa step-up + login_attempts antigos
CREATE OR REPLACE FUNCTION public.purge_expired_security_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Limpa artefatos de step-up via helper existente
  PERFORM public.purge_expired_step_up_artifacts(60, 60);
  
  -- Limpa tentativas de login antigas (90 dias)
  DELETE FROM public.login_attempts WHERE created_at < now() - interval '90 days';
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.purge_expired_security_data() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.purge_expired_security_data() IS
  'Migrada do Lovable em 2026-05-22 (Lote F). Purge step-up + login_attempts. Agendar pg_cron a cada 15min.';

-- 3) cleanup_old_telemetry: trigger function que apaga frontend_telemetry > 15d
--    Nota: no Lovable não há trigger anexado a essa função; criada por paridade.
CREATE OR REPLACE FUNCTION public.cleanup_old_telemetry()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM public.frontend_telemetry WHERE created_at < now() - interval '15 days';
    RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.cleanup_old_telemetry() IS
  'Migrada do Lovable em 2026-05-22 (Lote F). Trigger function. Apaga frontend_telemetry > 15d.';
