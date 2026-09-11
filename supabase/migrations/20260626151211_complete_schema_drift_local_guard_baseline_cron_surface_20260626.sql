-- =====================================================================
-- MELHORIA 4 (conclusão) — Guard local anti-drift Lovable: 100% funcional
-- Sessão anterior criou as funções/tabelas mas deixou:
--   (a) baseline VAZIO  -> guard reportava tudo como drift (n_added=6965)
--   (b) cron 245 apontando p/ fn_run_schema_drift_check (REMOTO via pg_net,
--       que SEMPRE dá timeout pois pg_net só envia após commit da txn)
--   (c) drift sem superfície de alerta (log silencioso)
-- Esta migration finaliza: baseline + cron->local + surface em v_system_alerts
-- fix_version: schema_drift_local_guard_v2
-- =====================================================================

-- (1) Captura a baseline certificada de HOJE (idempotente: DELETE+INSERT)
SELECT public.fn_capture_schema_baseline('certified_baseline_20260626');

-- (2) Reaponta o cron 245 para o guard LOCAL (síncrono, sem dependência externa)
SELECT cron.alter_job(
  job_id => 245,
  command => $cmd$SELECT public.fn_cron_safe_run(25::bigint, $q$SELECT public.fn_check_schema_signature_drift();$q$, 30000, 'schema-drift-local');$cmd$
);

-- (3) Documenta o mecanismo REMOTO como desativado (mantido p/ refactor async futuro)
COMMENT ON FUNCTION public.fn_run_schema_drift_check() IS
  '[DESATIVADO 2026-06-26] Compara schema vs projeto Lovable via pg_net. NAO agendado: pg_net so envia HTTP apos commit da txn, entao polling sincrono sempre da timeout. Substituido no cron 245 pelo guard LOCAL fn_check_schema_signature_drift(). Manter so se for refatorado p/ padrao async (trigger fetch + finalize separado).';

-- (4) Superfície de alerta: drift de schema aparece em v_system_alerts (read-only)
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
             OR count(CASE WHEN d.status = 'failed'::text THEN 1 ELSE NULL::integer END) >= 1
                AND max(CASE WHEN d.status = 'failed'::text THEN d.start_time ELSE NULL::timestamp with time zone END) >
                    max(CASE WHEN d.status = 'succeeded'::text THEN d.start_time ELSE NULL::timestamp with time zone END)
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
         SELECT 'PRODUCTS_NO_IMAGE'::text AS codigo,
            'info'::text AS severidade,
            'Produtos ativos sem imagem principal'::text AS mensagem,
            count(*)::text AS detalhe
           FROM products
          WHERE products.is_active = true AND products.primary_image_url IS NULL
         HAVING count(*) > 0
        ), vss_no_preferred AS (
         SELECT 'VSS_NO_PREFERRED'::text AS codigo,
            'warning'::text AS severidade,
            'Variantes ativas sem fornecedor preferido'::text AS mensagem,
            count(*)::text AS detalhe
           FROM product_variants pv
          WHERE pv.is_active = true AND NOT (EXISTS ( SELECT 1
                   FROM variant_supplier_sources v
                  WHERE v.variant_id = pv.id AND v.is_preferred = true AND v.is_active = true))
         HAVING count(*) > 0
        ), ai_queue_stale AS (
         SELECT 'AI_QUEUE_STALE'::text AS codigo,
            'info'::text AS severidade,
            'Itens na fila IA ha mais de 7 dias (worker inativo > 24h)'::text AS mensagem,
            count(*)::text AS detalhe
           FROM ai_enrichment_queue
          WHERE ai_enrichment_queue.status = 'pending'::text AND ai_enrichment_queue.created_at < (now() - '7 days'::interval)
            AND NOT (EXISTS ( SELECT 1
                   FROM ai_enrichment_queue w
                  WHERE w.status = 'processing'::text AND w.locked_at > (now() - '04:00:00'::interval)
                     OR w.status = 'done'::text AND w.completed_at > (now() - '24:00:00'::interval)
                 LIMIT 1))
         HAVING count(*) > 0
        ), products_no_ncm AS (
         SELECT 'PRODUCTS_NO_NCM'::text AS codigo,
            'critical'::text AS severidade,
            'Produtos ativos sem NCM (fiscal)'::text AS mensagem,
            count(*)::text AS detalhe
           FROM products
          WHERE products.is_active = true AND products.ncm_id IS NULL
         HAVING count(*) > 0
        ), stock_critical AS (
         SELECT 'STOCK_CRITICAL_LOW'::text AS codigo,
            'info'::text AS severidade,
            'Variantes ativas com estoque zero'::text AS mensagem,
            count(*)::text AS detalhe
           FROM product_variants pv
             JOIN variant_supplier_sources v ON v.variant_id = pv.id
          WHERE pv.is_active = true AND v.is_active = true AND v.quantity = 0
         HAVING count(*) > 0
        ), stale_sync AS (
         SELECT 'SUPPLIER_SYNC_STALE'::text AS codigo,
            'warning'::text AS severidade,
            ((('Fornecedor "'::text || s.name) || '" sem sync ha '::text) || round(EXTRACT(epoch FROM now() - s.last_full_sync_at) / 3600::numeric, 1)::text) || 'h'::text AS mensagem,
            s.last_full_sync_at::text AS detalhe
           FROM suppliers s
          WHERE s.sync_enabled = true
            AND (s.last_full_sync_at IS NULL OR s.last_full_sync_at < (now() - ((LEAST(GREATEST(COALESCE(s.sync_interval_minutes, 60) * 4, 240), 1440) || ' minutes'::text)::interval)))
        ), locked_by_residual AS (
         SELECT 'AI_QUEUE_LOCKED_RESIDUAL'::text AS codigo,
            'warning'::text AS severidade,
            'Items ai_enrichment_queue com locked_by residual em estado terminal'::text AS mensagem,
            count(*)::text AS detalhe
           FROM ai_enrichment_queue
          WHERE ai_enrichment_queue.locked_by IS NOT NULL AND (ai_enrichment_queue.status <> ALL (ARRAY['processing'::text, 'pending'::text]))
         HAVING count(*) > 100
        ), schema_drift AS (
         -- MELHORIA 4: drift de schema detectado pelo guard local (vs baseline certificada)
         SELECT 'SCHEMA_DRIFT_DETECTED'::text AS codigo,
            'warning'::text AS severidade,
            'Schema divergente da baseline certificada (possivel alteracao do bot Lovable)'::text AS mensagem,
            format('cols +%s/-%s/~%s; tabelas +%s/-%s (baseline=%s; verificado %s)',
                   l.n_added, l.n_removed, l.n_retyped,
                   COALESCE(array_length(l.tables_added, 1), 0),
                   COALESCE(array_length(l.tables_removed, 1), 0),
                   l.baseline_label, l.ran_at::timestamp(0) without time zone)::text AS detalhe
           FROM public.schema_signature_drift_log l
          WHERE l.ran_at = (SELECT max(l2.ran_at) FROM public.schema_signature_drift_log l2)
            AND l.has_drift = true
        )
 SELECT codigo, severidade, mensagem, detalhe, now() AS detected_at
   FROM ( SELECT cron_alerts.codigo, cron_alerts.severidade, cron_alerts.mensagem, cron_alerts.detalhe FROM cron_alerts
        UNION ALL SELECT import_stalled.codigo, import_stalled.severidade, import_stalled.mensagem, import_stalled.detalhe FROM import_stalled
        UNION ALL SELECT products_no_image.codigo, products_no_image.severidade, products_no_image.mensagem, products_no_image.detalhe FROM products_no_image
        UNION ALL SELECT vss_no_preferred.codigo, vss_no_preferred.severidade, vss_no_preferred.mensagem, vss_no_preferred.detalhe FROM vss_no_preferred
        UNION ALL SELECT ai_queue_stale.codigo, ai_queue_stale.severidade, ai_queue_stale.mensagem, ai_queue_stale.detalhe FROM ai_queue_stale
        UNION ALL SELECT products_no_ncm.codigo, products_no_ncm.severidade, products_no_ncm.mensagem, products_no_ncm.detalhe FROM products_no_ncm
        UNION ALL SELECT stock_critical.codigo, stock_critical.severidade, stock_critical.mensagem, stock_critical.detalhe FROM stock_critical
        UNION ALL SELECT stale_sync.codigo, stale_sync.severidade, stale_sync.mensagem, stale_sync.detalhe FROM stale_sync
        UNION ALL SELECT locked_by_residual.codigo, locked_by_residual.severidade, locked_by_residual.mensagem, locked_by_residual.detalhe FROM locked_by_residual
        UNION ALL SELECT schema_drift.codigo, schema_drift.severidade, schema_drift.mensagem, schema_drift.detalhe FROM schema_drift) c
  ORDER BY (CASE severidade WHEN 'critical'::text THEN 1 WHEN 'warning'::text THEN 2 ELSE 3 END);

NOTIFY pgrst, 'reload schema';;
