
-- ============================================================
-- MIGRATION: expand_fn_cleanup_log_tables_v2_five_tables
--
-- PROBLEMA: 5 tabelas de log operacional SEM retenção configurada:
--   pipeline_run_log   → 175 rows/dia, projeção 63.875/ano SEM cleanup
--   video_validation_log → 2.193 rows, crescimento eventual
--   product_ai_history → 2.085 rows, 1 row expirada
--   audit_log_gravacao → 825 rows, 1.7MB, sem retenção
--   ingestion_run_log  → 79 rows, 31% dead tuple bloat
--
-- SOLUÇÃO: Adicionar todas à fn_cleanup_log_tables com retenção adequada
--   pipeline_run_log   → 90 dias  (log operacional denso)
--   video_validation_log → 60 dias (mesmo padrão dos image_validation_log)
--   product_ai_history → 90 dias  (histórico de versões AI)
--   audit_log_gravacao → 180 dias (audit de preços = dado de negócio relevante)
--   ingestion_run_log  → 30 dias  (log operacional leve)
--
-- ADICIONALMENTE: Adicionar limpeza de audit_logs (90d, função purge_old_audit_logs
-- não estava agendada — centralizar aqui para garantia)
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_cleanup_log_tables()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- ── Contadores ─────────────────────────────────────────────────
  v_deleted_audit              INTEGER;
  v_deleted_client_errors      INTEGER;
  v_deleted_telemetry          INTEGER;
  v_deleted_image_validation   INTEGER;
  v_deleted_image_import       INTEGER;
  v_deleted_search_analytics   INTEGER;
  v_deleted_catalog_analytics  INTEGER;
  -- NOVOS (v2)
  v_deleted_pipeline_run       INTEGER;
  v_deleted_video_validation   INTEGER;
  v_deleted_product_ai         INTEGER;
  v_deleted_audit_gravacao     INTEGER;
  v_deleted_ingestion_run      INTEGER;
  v_deleted_audit_logs         INTEGER;

  -- ── Janelas de retenção ────────────────────────────────────────
  v_retention_audit            INTERVAL := INTERVAL '90 days';
  v_retention_client_error     INTERVAL := INTERVAL '7 days';
  v_retention_telemetry        INTERVAL := INTERVAL '30 days';
  v_retention_image_logs       INTERVAL := INTERVAL '60 days';
  v_retention_search           INTERVAL := INTERVAL '90 days';
  v_retention_catalog          INTERVAL := INTERVAL '90 days';
  -- NOVOS (v2)
  v_retention_pipeline_run     INTERVAL := INTERVAL '90 days';
  v_retention_video_validation INTERVAL := INTERVAL '60 days';
  v_retention_product_ai       INTERVAL := INTERVAL '90 days';
  v_retention_audit_gravacao   INTERVAL := INTERVAL '180 days';
  v_retention_ingestion_run    INTERVAL := INTERVAL '30 days';
  v_retention_audit_logs       INTERVAL := INTERVAL '90 days';
BEGIN
  -- ── ORIGINAIS (preservados integralmente) ─────────────────────

  -- admin_audit_log: manter 90 dias (eventos de auditoria reais)
  DELETE FROM public.admin_audit_log
  WHERE created_at < NOW() - v_retention_audit
    AND action != 'client_error';
  GET DIAGNOSTICS v_deleted_audit = ROW_COUNT;

  -- client_error no admin_audit_log: 7 dias (belt+suspenders)
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

  -- ── NOVOS (v2) — 5 tabelas sem retenção anterior ──────────────

  -- pipeline_run_log: manter 90 dias
  -- (fn_pipeline_promote_tick ESCREVE aqui; DELETE seguro com 90d)
  DELETE FROM public.pipeline_run_log
  WHERE started_at < NOW() - v_retention_pipeline_run;
  GET DIAGNOSTICS v_deleted_pipeline_run = ROW_COUNT;

  -- video_validation_log: manter 60 dias
  -- (validated_at é nullable — preservar NULLs: validações em progresso)
  DELETE FROM public.video_validation_log
  WHERE validated_at IS NOT NULL
    AND validated_at < NOW() - v_retention_video_validation;
  GET DIAGNOSTICS v_deleted_video_validation = ROW_COUNT;

  -- product_ai_history: manter 90 dias
  -- (compare_product_ai_versions e get_product_ai_history leem aqui — 90d é janela adequada)
  DELETE FROM public.product_ai_history
  WHERE created_at < NOW() - v_retention_product_ai;
  GET DIAGNOSTICS v_deleted_product_ai = ROW_COUNT;

  -- audit_log_gravacao: manter 180 dias
  -- (audit de tabelas de preço de gravação = dado de negócio importante)
  -- (ts é nullable — preservar NULLs)
  DELETE FROM public.audit_log_gravacao
  WHERE ts IS NOT NULL
    AND ts < NOW() - v_retention_audit_gravacao;
  GET DIAGNOSTICS v_deleted_audit_gravacao = ROW_COUNT;

  -- ingestion_run_log: manter 30 dias
  -- (fn_ingestion_run_open/close escrevem aqui — 30d cobre análise operacional)
  DELETE FROM public.ingestion_run_log
  WHERE started_at < NOW() - v_retention_ingestion_run;
  GET DIAGNOSTICS v_deleted_ingestion_run = ROW_COUNT;

  -- audit_logs: manter 90 dias
  -- (função purge_old_audit_logs existia mas não estava agendada —
  --  centralizar aqui para garantia de execução semanal)
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - v_retention_audit_logs;
  GET DIAGNOSTICS v_deleted_audit_logs = ROW_COUNT;

  RETURN jsonb_build_object(
    -- originais
    'admin_audit_log_deleted',       v_deleted_audit,
    'client_errors_purged',          v_deleted_client_errors,
    'frontend_telemetry_deleted',    v_deleted_telemetry,
    'image_validation_log_deleted',  v_deleted_image_validation,
    'image_import_log_deleted',      v_deleted_image_import,
    'search_analytics_deleted',      v_deleted_search_analytics,
    'catalog_analytics_deleted',     v_deleted_catalog_analytics,
    -- novos v2
    'pipeline_run_log_deleted',      v_deleted_pipeline_run,
    'video_validation_log_deleted',  v_deleted_video_validation,
    'product_ai_history_deleted',    v_deleted_product_ai,
    'audit_log_gravacao_deleted',    v_deleted_audit_gravacao,
    'ingestion_run_log_deleted',     v_deleted_ingestion_run,
    'audit_logs_deleted',            v_deleted_audit_logs,
    'executed_at',                   NOW()
  );
END;
$$;

-- Garantir que apenas service_role executa
REVOKE ALL ON FUNCTION public.fn_cleanup_log_tables() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cleanup_log_tables() TO service_role;
;
