-- ============================================================================
-- M6 (guarda): adiciona SILVER_PROMOTE_STALLED a v_system_alerts.
-- Torna VISIVEL o halt de promocao Prata->Ouro que ficou silencioso por 3 dias
-- (registros 'standardized' nao promovidos nao geravam nenhum alerta; o
--  IMPORT_STALLED existente so cobre Bronze pendente, nao o backlog da Prata).
-- fix_version = silver_promote_stalled_alert_v1
-- ANTI-REGRESSAO: preservar TODAS as 10 CTEs originais + a nova abaixo.
-- ============================================================================
CREATE OR REPLACE VIEW public.v_system_alerts AS
WITH cron_alerts AS (
  SELECT 'CRON_FAIL_RECENT'::text AS codigo,
         'critical'::text AS severidade,
         ((('Job '::text || j.jobid) || ' ('::text) || j.jobname) || ') com falhas na ultima hora'::text AS mensagem,
         count(CASE WHEN d.status = 'failed'::text THEN 1 ELSE NULL::integer END)::text AS detalhe
    FROM cron.job_run_details d
    JOIN cron.job j ON j.jobid = d.jobid
   WHERE d.start_time > (now() - '01:00:00'::interval)
   GROUP BY j.jobid, j.jobname
  HAVING count(CASE WHEN d.status = 'failed'::text THEN 1 ELSE NULL::integer END) >= 3
      OR (count(CASE WHEN d.status = 'failed'::text THEN 1 ELSE NULL::integer END) >= 1
          AND max(CASE WHEN d.status = 'failed'::text THEN d.start_time ELSE NULL::timestamptz END)
            > max(CASE WHEN d.status = 'succeeded'::text THEN d.start_time ELSE NULL::timestamptz END))
), import_stalled AS (
  SELECT 'IMPORT_STALLED'::text AS codigo,
         'warning'::text AS severidade,
         'Batches Bronze pendentes ha mais de 1h'::text AS mensagem,
         count(DISTINCT COALESCE(supplier_products_raw.import_batch_id::text, supplier_products_raw.supplier_id::text))::text AS detalhe
    FROM supplier_products_raw
   WHERE (supplier_products_raw.status = ANY (ARRAY['pending'::supplier_raw_status, 'processing'::supplier_raw_status]))
     AND supplier_products_raw.imported_at < (now() - '01:00:00'::interval)
  HAVING count(*) > 0
), products_no_image AS (
  SELECT 'PRODUCTS_NO_IMAGE'::text AS codigo, 'info'::text AS severidade,
         'Produtos ativos sem imagem principal'::text AS mensagem, count(*)::text AS detalhe
    FROM products
   WHERE products.is_active = true AND products.primary_image_url IS NULL
  HAVING count(*) > 0
), vss_no_preferred AS (
  SELECT 'VSS_NO_PREFERRED'::text AS codigo, 'warning'::text AS severidade,
         'Variantes ativas sem fornecedor preferido'::text AS mensagem, count(*)::text AS detalhe
    FROM product_variants pv
   WHERE pv.is_active = true
     AND NOT (EXISTS (SELECT 1 FROM variant_supplier_sources v
                       WHERE v.variant_id = pv.id AND v.is_preferred = true AND v.is_active = true))
  HAVING count(*) > 0
), ai_queue_stale AS (
  SELECT 'AI_QUEUE_STALE'::text AS codigo, 'info'::text AS severidade,
         'Itens na fila IA ha mais de 7 dias (worker inativo > 24h)'::text AS mensagem, count(*)::text AS detalhe
    FROM ai_enrichment_queue
   WHERE ai_enrichment_queue.status = 'pending'::text
     AND ai_enrichment_queue.created_at < (now() - '7 days'::interval)
     AND NOT (EXISTS (SELECT 1 FROM ai_enrichment_queue w
                       WHERE (w.status = 'processing'::text AND w.locked_at > (now() - '04:00:00'::interval))
                          OR (w.status = 'done'::text AND w.completed_at > (now() - '24:00:00'::interval))
                       LIMIT 1))
  HAVING count(*) > 0
), products_no_ncm AS (
  SELECT 'PRODUCTS_NO_NCM'::text AS codigo, 'critical'::text AS severidade,
         'Produtos ativos sem NCM (fiscal)'::text AS mensagem, count(*)::text AS detalhe
    FROM products
   WHERE products.is_active = true AND products.ncm_id IS NULL
  HAVING count(*) > 0
), stock_critical AS (
  SELECT 'STOCK_CRITICAL_LOW'::text AS codigo, 'info'::text AS severidade,
         'Variantes ativas com estoque zero'::text AS mensagem, count(*)::text AS detalhe
    FROM product_variants pv
    JOIN variant_supplier_sources v ON v.variant_id = pv.id
   WHERE pv.is_active = true AND v.is_active = true AND v.quantity = 0
  HAVING count(*) > 0
), stale_sync AS (
  SELECT 'SUPPLIER_SYNC_STALE'::text AS codigo, 'warning'::text AS severidade,
         ((('Fornecedor "'::text || s.name) || '" sem sync ha '::text)
            || round(EXTRACT(epoch FROM now() - s.last_full_sync_at) / 3600::numeric, 1)::text) || 'h'::text AS mensagem,
         s.last_full_sync_at::text AS detalhe
    FROM suppliers s
   WHERE s.sync_enabled = true
     AND (s.last_full_sync_at IS NULL
          OR s.last_full_sync_at < (now() - ((LEAST(GREATEST(COALESCE(s.sync_interval_minutes, 60) * 4, 240), 1440) || ' minutes'::text)::interval)))
), locked_by_residual AS (
  SELECT 'AI_QUEUE_LOCKED_RESIDUAL'::text AS codigo, 'warning'::text AS severidade,
         'Items ai_enrichment_queue com locked_by residual em estado terminal'::text AS mensagem, count(*)::text AS detalhe
    FROM ai_enrichment_queue
   WHERE ai_enrichment_queue.locked_by IS NOT NULL
     AND (ai_enrichment_queue.status <> ALL (ARRAY['processing'::text, 'pending'::text]))
  HAVING count(*) > 100
), schema_drift AS (
  SELECT 'SCHEMA_DRIFT_DETECTED'::text AS codigo, 'warning'::text AS severidade,
         'Schema divergente da baseline certificada (possivel alteracao do bot Lovable)'::text AS mensagem,
         format('cols +%s/-%s/~%s; tabelas +%s/-%s (baseline=%s; verificado %s)'::text,
                l.n_added, l.n_removed, l.n_retyped,
                COALESCE(array_length(l.tables_added, 1), 0), COALESCE(array_length(l.tables_removed, 1), 0),
                l.baseline_label, l.ran_at::timestamp(0) without time zone) AS detalhe
    FROM schema_signature_drift_log l
   WHERE l.ran_at = (SELECT max(l2.ran_at) FROM schema_signature_drift_log l2)
     AND l.has_drift = true
), silver_promote_stalled AS (
  SELECT 'SILVER_PROMOTE_STALLED'::text AS codigo,
         'warning'::text AS severidade,
         'Promocao Prata->Ouro possivelmente parada (pads padronizados ha >2h ou variantes orfas com pai ja promovido)'::text AS mensagem,
         format('pads_std_2h=%s, variantes_orfas=%s',
            (SELECT count(*) FROM produtos_padronizacao pp
              WHERE pp.status::text = 'standardized' AND pp.standardized_at < (now() - '02:00:00'::interval)),
            (SELECT count(*) FROM produtos_padronizacao_variantes pv
              WHERE pv.status::text = 'standardized'
                AND EXISTS (SELECT 1 FROM produtos_padronizacao pp2
                             WHERE pp2.supplier_id = pv.supplier_id
                               AND pp2.supplier_reference = pv.parent_reference
                               AND pp2.status::text = 'promoted'))
         ) AS detalhe
   WHERE (
       (SELECT count(*) FROM produtos_padronizacao pp
         WHERE pp.status::text = 'standardized' AND pp.standardized_at < (now() - '02:00:00'::interval))
     + (SELECT count(*) FROM produtos_padronizacao_variantes pv
         WHERE pv.status::text = 'standardized'
           AND EXISTS (SELECT 1 FROM produtos_padronizacao pp2
                        WHERE pp2.supplier_id = pv.supplier_id
                          AND pp2.supplier_reference = pv.parent_reference
                          AND pp2.status::text = 'promoted'))
   ) > 0
)
SELECT codigo, severidade, mensagem, detalhe, now() AS detected_at
  FROM (
        SELECT codigo, severidade, mensagem, detalhe FROM cron_alerts
  UNION ALL SELECT codigo, severidade, mensagem, detalhe FROM import_stalled
  UNION ALL SELECT codigo, severidade, mensagem, detalhe FROM products_no_image
  UNION ALL SELECT codigo, severidade, mensagem, detalhe FROM vss_no_preferred
  UNION ALL SELECT codigo, severidade, mensagem, detalhe FROM ai_queue_stale
  UNION ALL SELECT codigo, severidade, mensagem, detalhe FROM products_no_ncm
  UNION ALL SELECT codigo, severidade, mensagem, detalhe FROM stock_critical
  UNION ALL SELECT codigo, severidade, mensagem, detalhe FROM stale_sync
  UNION ALL SELECT codigo, severidade, mensagem, detalhe FROM locked_by_residual
  UNION ALL SELECT codigo, severidade, mensagem, detalhe FROM schema_drift
  UNION ALL SELECT codigo, severidade, mensagem, detalhe FROM silver_promote_stalled
  ) c
 ORDER BY (CASE severidade WHEN 'critical'::text THEN 1 WHEN 'warning'::text THEN 2 ELSE 3 END);

NOTIFY pgrst, 'reload schema';
;
