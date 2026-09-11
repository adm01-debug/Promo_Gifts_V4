
-- Corrigir fn_cleanup_log_tables: remover referência a image_validation_log (agora em archive)
-- Cron cleanup-log-tables-weekly (todo domingo 3am) chamaria esta função e falharia
CREATE OR REPLACE FUNCTION public.fn_cleanup_log_tables()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted_audit              INTEGER;
  v_deleted_client_errors      INTEGER;
  v_deleted_telemetry          INTEGER;
  v_deleted_search_analytics   INTEGER;
  v_deleted_catalog_analytics  INTEGER;
  v_deleted_pipeline_run       INTEGER;
  v_deleted_video_validation   INTEGER;
  v_deleted_product_ai         INTEGER;
  v_deleted_audit_gravacao     INTEGER;
  v_deleted_ingestion_run      INTEGER;

  v_retention_audit            INTERVAL := INTERVAL '90 days';
  v_retention_client_error     INTERVAL := INTERVAL '7 days';
  v_retention_telemetry        INTERVAL := INTERVAL '30 days';
  v_retention_search           INTERVAL := INTERVAL '90 days';
  v_retention_catalog          INTERVAL := INTERVAL '90 days';
  v_retention_pipeline_run     INTERVAL := INTERVAL '90 days';
  v_retention_video_validation INTERVAL := INTERVAL '60 days';
  v_retention_product_ai       INTERVAL := INTERVAL '90 days';
  v_retention_audit_gravacao   INTERVAL := INTERVAL '180 days';
  v_retention_ingestion_run    INTERVAL := INTERVAL '30 days';
BEGIN
  DELETE FROM public.admin_audit_log
  WHERE created_at < NOW() - v_retention_audit AND action != 'client_error';
  GET DIAGNOSTICS v_deleted_audit = ROW_COUNT;

  DELETE FROM public.admin_audit_log
  WHERE action = 'client_error' AND created_at < NOW() - v_retention_client_error;
  GET DIAGNOSTICS v_deleted_client_errors = ROW_COUNT;

  DELETE FROM public.frontend_telemetry
  WHERE created_at < NOW() - v_retention_telemetry;
  GET DIAGNOSTICS v_deleted_telemetry = ROW_COUNT;

  -- image_validation_log: arquivada em 2026-06-19 → não recebe mais writes. Bloco removido.

  DELETE FROM public.search_analytics
  WHERE created_at < NOW() - v_retention_search;
  GET DIAGNOSTICS v_deleted_search_analytics = ROW_COUNT;

  DELETE FROM public.catalog_analytics
  WHERE created_at < NOW() - v_retention_catalog;
  GET DIAGNOSTICS v_deleted_catalog_analytics = ROW_COUNT;

  DELETE FROM public.pipeline_run_log
  WHERE started_at < NOW() - v_retention_pipeline_run;
  GET DIAGNOSTICS v_deleted_pipeline_run = ROW_COUNT;

  DELETE FROM public.video_validation_log
  WHERE validated_at IS NOT NULL AND validated_at < NOW() - v_retention_video_validation;
  GET DIAGNOSTICS v_deleted_video_validation = ROW_COUNT;

  DELETE FROM public.product_ai_history
  WHERE created_at < NOW() - v_retention_product_ai;
  GET DIAGNOSTICS v_deleted_product_ai = ROW_COUNT;

  DELETE FROM public.audit_log_gravacao
  WHERE ts IS NOT NULL AND ts < NOW() - v_retention_audit_gravacao;
  GET DIAGNOSTICS v_deleted_audit_gravacao = ROW_COUNT;

  DELETE FROM public.ingestion_run_log
  WHERE started_at < NOW() - v_retention_ingestion_run;
  GET DIAGNOSTICS v_deleted_ingestion_run = ROW_COUNT;

  RETURN jsonb_build_object(
    'admin_audit_log_deleted',       v_deleted_audit,
    'client_errors_purged',          v_deleted_client_errors,
    'frontend_telemetry_deleted',    v_deleted_telemetry,
    'search_analytics_deleted',      v_deleted_search_analytics,
    'catalog_analytics_deleted',     v_deleted_catalog_analytics,
    'pipeline_run_log_deleted',      v_deleted_pipeline_run,
    'video_validation_log_deleted',  v_deleted_video_validation,
    'product_ai_history_deleted',    v_deleted_product_ai,
    'audit_log_gravacao_deleted',    v_deleted_audit_gravacao,
    'ingestion_run_log_deleted',     v_deleted_ingestion_run,
    'archived_tables_skipped',       ARRAY['audit_logs','image_import_log','image_validation_log'],
    'executed_at',                   NOW()
  );
END;
$function$;
;
