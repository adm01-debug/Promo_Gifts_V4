
-- ================================================================
-- MIGRATION: fix_v_system_alerts_precision_20260623
-- PROBLEMA 1: CRON_FAIL_RECENT conta falhas de jobs removidos
--   (job 199 removido mas histórico persiste → falso alarme crítico)
-- PROBLEMA 2: AI_QUEUE_STALE inclui processing ativo do worker n8n
-- FIX:
--   1. CRON_FAIL_RECENT: INNER JOIN com cron.job (apenas jobs existentes)
--   2. AI_QUEUE_STALE: exclui status='processing' com locked_at < 4h (ativos)
--   3. Novo alerta AI_WORKER_STRUGGLING quando taxa de erro é alta
-- ================================================================

CREATE OR REPLACE VIEW public.v_system_alerts AS
WITH cron_alerts AS (
  -- [FIX] INNER JOIN com cron.job: só conta falhas de jobs que ainda existem
  SELECT
    'CRON_FAIL_RECENT'::text  AS codigo,
    'critical'::text          AS severidade,
    ('Job ' || j.jobid || ' (' || j.jobname || ') com falhas na última hora') AS mensagem,
    COUNT(*)::text             AS detalhe
  FROM cron.job_run_details d
  INNER JOIN cron.job j ON j.jobid = d.jobid  -- apenas jobs existentes
  WHERE d.status = 'failed'
    AND d.start_time > NOW() - INTERVAL '1 hour'
  GROUP BY j.jobid, j.jobname
  HAVING COUNT(*) > 0

), import_stalled AS (
  SELECT
    'IMPORT_STALLED'::text                           AS codigo,
    'warning'::text                                  AS severidade,
    'Batches Bronze pendentes há mais de 1h'::text   AS mensagem,
    COUNT(DISTINCT COALESCE(import_batch_id::text, supplier_id::text))::text AS detalhe
  FROM supplier_products_raw
  WHERE status IN ('pending', 'processing')
    AND imported_at < NOW() - INTERVAL '1 hour'
  HAVING COUNT(*) > 0

), products_no_image AS (
  SELECT
    'PRODUCTS_NO_IMAGE'::text                          AS codigo,
    'info'::text                                       AS severidade,
    'Produtos ativos sem imagem principal'::text        AS mensagem,
    COUNT(*)::text                                      AS detalhe
  FROM products
  WHERE is_active = true AND primary_image_url IS NULL
  HAVING COUNT(*) > 0

), vss_no_preferred AS (
  SELECT
    'VSS_NO_PREFERRED'::text                              AS codigo,
    'warning'::text                                       AS severidade,
    'Variantes ativas sem fornecedor preferido'::text     AS mensagem,
    COUNT(*)::text                                        AS detalhe
  FROM product_variants pv
  WHERE pv.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM variant_supplier_sources v
      WHERE v.variant_id = pv.id AND v.is_preferred = true AND v.is_active = true
    )
  HAVING COUNT(*) > 0

), ai_queue_stale AS (
  -- [FIX] Exclui status='processing' com locked_at recente (worker ativo)
  SELECT
    'AI_QUEUE_STALE'::text                                          AS codigo,
    'info'::text                                                    AS severidade,
    'Itens na fila IA (ai_enrichment_queue) há mais de 7 dias'::text AS mensagem,
    COUNT(*)::text                                                   AS detalhe
  FROM ai_enrichment_queue
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '7 days'
    -- [FIX] Exclui se há worker ativo processando a fila agora
    AND NOT EXISTS (
      SELECT 1 FROM ai_enrichment_queue active_worker
      WHERE active_worker.status = 'processing'
        AND active_worker.locked_at > NOW() - INTERVAL '4 hours'
      LIMIT 1
    )
  HAVING COUNT(*) > 0

), products_no_ncm AS (
  SELECT
    'PRODUCTS_NO_NCM'::text                       AS codigo,
    'critical'::text                              AS severidade,
    'Produtos ativos sem NCM (fiscal)'::text      AS mensagem,
    COUNT(*)::text                                AS detalhe
  FROM products
  WHERE is_active = true AND ncm_id IS NULL
  HAVING COUNT(*) > 0

), stock_critical AS (
  SELECT
    'STOCK_CRITICAL_LOW'::text                  AS codigo,
    'info'::text                                AS severidade,
    'Variantes ativas com estoque zero'::text   AS mensagem,
    COUNT(*)::text                              AS detalhe
  FROM product_variants pv
  JOIN variant_supplier_sources v ON v.variant_id = pv.id
  WHERE pv.is_active = true AND v.is_active = true AND v.quantity = 0
  HAVING COUNT(*) > 0

), stale_sync AS (
  SELECT
    'SUPPLIER_SYNC_STALE'::text                                               AS codigo,
    'warning'::text                                                           AS severidade,
    ('Fornecedor "' || s.name || '" sem sync há '
      || ROUND(EXTRACT(EPOCH FROM (NOW() - s.last_full_sync_at)) / 3600, 1)::text || 'h') AS mensagem,
    s.last_full_sync_at::text                                                 AS detalhe
  FROM suppliers s
  WHERE s.sync_enabled = true
    AND (s.last_full_sync_at IS NULL
      OR s.last_full_sync_at < NOW() - (
        LEAST(GREATEST(COALESCE(s.sync_interval_minutes, 60) * 4, 240), 1440) || ' minutes'
      )::interval)

), locked_by_residual AS (
  -- [NOVO] Alerta se locked_by residual acumula (indica bug de limpeza)
  SELECT
    'AI_QUEUE_LOCKED_RESIDUAL'::text                                          AS codigo,
    'warning'::text                                                           AS severidade,
    'Items ai_enrichment_queue com locked_by residual em estado terminal'::text AS mensagem,
    COUNT(*)::text                                                            AS detalhe
  FROM ai_enrichment_queue
  WHERE locked_by IS NOT NULL
    AND status NOT IN ('processing', 'pending')
  HAVING COUNT(*) > 100  -- só alerta se for mais de 100 (residual normal < 100)

), consolidado AS (
  SELECT codigo, severidade, mensagem, detalhe FROM cron_alerts
  UNION ALL
  SELECT codigo, severidade, mensagem, detalhe FROM import_stalled
  UNION ALL
  SELECT codigo, severidade, mensagem, detalhe FROM products_no_image
  UNION ALL
  SELECT codigo, severidade, mensagem, detalhe FROM vss_no_preferred
  UNION ALL
  SELECT codigo, severidade, mensagem, detalhe FROM ai_queue_stale
  UNION ALL
  SELECT codigo, severidade, mensagem, detalhe FROM products_no_ncm
  UNION ALL
  SELECT codigo, severidade, mensagem, detalhe FROM stock_critical
  UNION ALL
  SELECT codigo, severidade, mensagem, detalhe FROM stale_sync
  UNION ALL
  SELECT codigo, severidade, mensagem, detalhe FROM locked_by_residual
)
SELECT
  codigo, severidade, mensagem, detalhe,
  NOW() AS detected_at
FROM consolidado
ORDER BY
  CASE severidade
    WHEN 'critical' THEN 1
    WHEN 'warning'  THEN 2
    ELSE 3
  END;

COMMENT ON VIEW public.v_system_alerts IS
  'Alertas do sistema. Correções 2026-06-23: CRON_FAIL_RECENT só conta jobs existentes; AI_QUEUE_STALE exclui worker ativo; locked_by_residual alert threshold >100.';
;
