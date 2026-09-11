
-- ============================================================
-- MIGRATION: fix_audit_log_retention_consistency
-- PROBLEMA: Conflito de retention para admin_audit_log:
--   cleanup_security_logs  → 365 dias (ERRADO)
--   fn_cleanup_log_tables  →  90 dias (CORRETO)
-- SOLUÇÃO: Harmonizar para 90 dias + adicionar belt+suspenders
--          para client_error com retenção de apenas 7 dias
-- ============================================================

-- 1. Corrigir cleanup_security_logs
CREATE OR REPLACE FUNCTION public.cleanup_security_logs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token_failures_deleted      int := 0;
  _bot_log_deleted             int := 0;
  _audit_log_deleted           int := 0;
  _client_errors_deleted       int := 0;
  _ip_expired_deleted          int := 0;
BEGIN
  WITH d AS (
    DELETE FROM public.public_token_failures 
    WHERE created_at < now() - INTERVAL '90 days' RETURNING 1
  )
  SELECT count(*) INTO _token_failures_deleted FROM d;

  WITH d AS (
    DELETE FROM public.bot_detection_log 
    WHERE created_at < now() - INTERVAL '90 days' RETURNING 1
  )
  SELECT count(*) INTO _bot_log_deleted FROM d;

  -- admin_audit_log: retenção harmonizada para 90 dias (era 365d — inconsistente)
  WITH d AS (
    DELETE FROM public.admin_audit_log 
    WHERE created_at < now() - INTERVAL '90 days'
      AND action != 'client_error'
    RETURNING 1
  )
  SELECT count(*) INTO _audit_log_deleted FROM d;

  -- client_error: retenção agressiva de 7 dias (ruído de dev)
  WITH d AS (
    DELETE FROM public.admin_audit_log 
    WHERE action = 'client_error'
      AND created_at < now() - INTERVAL '7 days'
    RETURNING 1
  )
  SELECT count(*) INTO _client_errors_deleted FROM d;

  WITH d AS (
    DELETE FROM public.ip_access_control
    WHERE expires_at IS NOT NULL AND expires_at < now() - INTERVAL '30 days'
    RETURNING 1
  )
  SELECT count(*) INTO _ip_expired_deleted FROM d;

  RETURN jsonb_build_object(
    'ok',                                true,
    'ran_at',                            now(),
    'public_token_failures_deleted',     _token_failures_deleted,
    'bot_detection_log_deleted',         _bot_log_deleted,
    'admin_audit_log_deleted',           _audit_log_deleted,
    'client_errors_purged',              _client_errors_deleted,
    'ip_access_control_expired_deleted', _ip_expired_deleted
  );
END;
$$;

-- 2. Corrigir fn_cleanup_log_tables: adicionar limpeza de client_error
CREATE OR REPLACE FUNCTION public.fn_cleanup_log_tables()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_audit             INTEGER;
  v_deleted_client_errors     INTEGER;
  v_deleted_telemetry         INTEGER;
  v_deleted_image_validation  INTEGER;
  v_deleted_image_import      INTEGER;
  v_deleted_search_analytics  INTEGER;
  v_deleted_catalog_analytics INTEGER;
  v_retention_audit           INTERVAL := INTERVAL '90 days';
  v_retention_client_error    INTERVAL := INTERVAL '7 days';
  v_retention_telemetry       INTERVAL := INTERVAL '30 days';
  v_retention_image_logs      INTERVAL := INTERVAL '60 days';
  v_retention_search          INTERVAL := INTERVAL '90 days';
  v_retention_catalog         INTERVAL := INTERVAL '90 days';
BEGIN
  -- admin_audit_log: manter 90 dias (eventos de auditoria reais)
  DELETE FROM public.admin_audit_log
  WHERE created_at < NOW() - v_retention_audit
    AND action != 'client_error';
  GET DIAGNOSTICS v_deleted_audit = ROW_COUNT;

  -- client_error no admin_audit_log: manter apenas 7 dias
  DELETE FROM public.admin_audit_log
  WHERE action = 'client_error'
    AND created_at < NOW() - v_retention_client_error;
  GET DIAGNOSTICS v_deleted_client_errors = ROW_COUNT;

  -- frontend_telemetry: manter 30 dias
  DELETE FROM public.frontend_telemetry
  WHERE created_at < NOW() - v_retention_telemetry;
  GET DIAGNOSTICS v_deleted_telemetry = ROW_COUNT;

  -- image_validation_log: manter 60 dias
  DELETE FROM public.image_validation_log
  WHERE validated_at < NOW() - v_retention_image_logs;
  GET DIAGNOSTICS v_deleted_image_validation = ROW_COUNT;

  -- image_import_log: manter 60 dias
  DELETE FROM public.image_import_log
  WHERE imported_at < NOW() - v_retention_image_logs;
  GET DIAGNOSTICS v_deleted_image_import = ROW_COUNT;

  -- search_analytics: manter 90 dias
  DELETE FROM public.search_analytics
  WHERE created_at < NOW() - v_retention_search;
  GET DIAGNOSTICS v_deleted_search_analytics = ROW_COUNT;

  -- catalog_analytics: manter 90 dias
  DELETE FROM public.catalog_analytics
  WHERE created_at < NOW() - v_retention_catalog;
  GET DIAGNOSTICS v_deleted_catalog_analytics = ROW_COUNT;

  RETURN jsonb_build_object(
    'admin_audit_log_deleted',      v_deleted_audit,
    'client_errors_purged',         v_deleted_client_errors,
    'frontend_telemetry_deleted',   v_deleted_telemetry,
    'image_validation_log_deleted', v_deleted_image_validation,
    'image_import_log_deleted',     v_deleted_image_import,
    'search_analytics_deleted',     v_deleted_search_analytics,
    'catalog_analytics_deleted',    v_deleted_catalog_analytics,
    'executed_at',                  NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_security_logs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_security_logs() TO service_role;

REVOKE ALL ON FUNCTION public.fn_cleanup_log_tables() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cleanup_log_tables() TO service_role;
;
