CREATE OR REPLACE FUNCTION public.fn_video_retry_errors(p_supplier text DEFAULT NULL::text, p_dry_run boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_permanent      integer := 0;
  v_transient      integer := 0;
  v_reset          integer := 0;
  v_already_marked integer := 0;
  v_supplier_list  text[];
BEGIN
  -- 1. Contar erros permanentes (já corretamente marcados ou novos)
  WITH classification AS (
    SELECT 
      id,
      youtube_id,
      source_supplier,
      last_error,
      retry_count,
      max_retries,
      CASE
        -- PERMANENTES (não retentar)
        WHEN last_error ~* '(video unavailable|private video|removed|not available|members-only|deleted|copyright|terminated)' THEN 'permanent'
        -- TRANSITÓRIOS (vale retry)
        WHEN last_error ~* '(timeout|rate.?limit|429|503|502|504|connection|network|EAI_AGAIN|ECONNRESET|ETIMEDOUT|invalid JSON|HTTP 5)' THEN 'transient'
        -- DESCONHECIDO (default: transient com 1 retry adicional)
        ELSE 'unknown'
      END AS classification
    FROM video_import_queue
    WHERE status LIKE 'error%'
      AND (p_supplier IS NULL OR LOWER(source_supplier) = LOWER(p_supplier))
  ),
  perm_count AS (
    SELECT COUNT(*) FROM classification WHERE classification = 'permanent'
  ),
  trans_count AS (
    SELECT COUNT(*) FROM classification 
    WHERE classification IN ('transient', 'unknown') 
      AND retry_count >= max_retries  -- precisam ser ressuscitados
  )
  SELECT 
    (SELECT * FROM perm_count),
    (SELECT * FROM trans_count)
  INTO v_permanent, v_transient;

  -- 2. Se DRY RUN, só retorna análise
  IF p_dry_run THEN
    RETURN jsonb_build_object(
      'ok',          true,
      'mode',        'dry_run',
      'supplier_filter', COALESCE(p_supplier, 'all'),
      'permanent_errors', v_permanent,
      'transient_errors_blocked', v_transient,
      'preview_actions', 'would mark ' || v_permanent || ' as max_retries (permanent) and reset ' || v_transient || ' to pending (transient)'
    );
  END IF;

  -- 3. APLICAR — Marcar permanentes (set retry_count=max_retries para nunca retentar)
  WITH classified AS (
    SELECT id
    FROM video_import_queue
    WHERE status LIKE 'error%'
      AND (p_supplier IS NULL OR LOWER(source_supplier) = LOWER(p_supplier))
      AND last_error ~* '(video unavailable|private video|removed|not available|members-only|deleted|copyright|terminated)'
      AND retry_count < max_retries  -- só atualiza os que ainda não foram marcados
  )
  UPDATE video_import_queue
  SET retry_count = max_retries,
      status = 'error_download',
      started_at = NULL,
      completed_at = NULL
  WHERE id IN (SELECT id FROM classified);
  GET DIAGNOSTICS v_already_marked = ROW_COUNT;

  -- 4. APLICAR — Resetar transitórios para pending (limpa retry_count)
  WITH classified AS (
    SELECT id
    FROM video_import_queue
    WHERE status LIKE 'error%'
      AND (p_supplier IS NULL OR LOWER(source_supplier) = LOWER(p_supplier))
      AND last_error ~* '(timeout|rate.?limit|429|503|502|504|connection|network|EAI_AGAIN|ECONNRESET|ETIMEDOUT|invalid JSON|HTTP 5)'
      AND retry_count >= max_retries  -- só os que estão bloqueados
  )
  UPDATE video_import_queue
  SET retry_count = 0,
      status = 'pending',
      last_error = 'auto-reset: transient error retry (' || COALESCE(last_error, 'unknown') || ')',
      started_at = NULL,
      completed_at = NULL
  WHERE id IN (SELECT id FROM classified);
  GET DIAGNOSTICS v_reset = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok',              true,
    'mode',            'apply',
    'supplier_filter', COALESCE(p_supplier, 'all'),
    'permanent_errors_total', v_permanent,
    'newly_marked_permanent', v_already_marked,
    'transient_blocked_total', v_transient,
    'reset_to_pending', v_reset
  );
END;
$function$
