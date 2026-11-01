-- Rollback de 20260917100000_e37_split_genuine_multistatement_cron.sql
-- Restaura os 5 cron jobs (233, 208, 195, 53, 244) aos commands originais
-- (bare/wrapped multi-statement). Reintroduz o risco de savepoint acoplado
-- descrito na migration E37.

SELECT cron.alter_job(233, command := $cmd$SELECT public.fn_cron_safe_run(154::bigint, $sql$
    UPDATE ai_enrichment_queue SET status='pending', locked_by=NULL, locked_at=NULL,
        last_error='cron-reset:stuck>'||ROUND(EXTRACT(EPOCH FROM (now()-locked_at))/3600,1)||'h', updated_at=now()
    WHERE status='processing' AND locked_at < now() - interval '2 hours' AND attempts < max_attempts;
    UPDATE ai_enrichment_queue SET status='error', locked_by=NULL, locked_at=NULL,
        last_error=COALESCE(last_error,'')||' | exhausted-max='||attempts::text, updated_at=now()
    WHERE status='processing' AND locked_at < now() - interval '1 hour' AND attempts >= max_attempts;
    UPDATE ai_enrichment_queue SET status='error',
        last_error=COALESCE(last_error,'')||' | pending-exhausted-max='||attempts::text, updated_at=now()
    WHERE status='pending' AND attempts >= max_attempts;
    UPDATE ai_enrichment_queue SET locked_by=NULL, locked_at=NULL, updated_at=now()
    WHERE status NOT IN ('processing','pending') AND locked_by IS NOT NULL;
  $sql$, 30000, 'ai-queue-stuck');$cmd$);

SELECT cron.alter_job(208, command := $cmd$
  SELECT public.fn_cron_safe_run(166::bigint, $sql$
    UPDATE products SET is_active = false, updated_at = now()
    WHERE is_active = true AND supplier_reference IS NULL AND sku IS NULL AND supplier_id IS NOT NULL;
    UPDATE products SET is_active = false, updated_at = now()
    WHERE 'active' = ANY(COALESCE(locked_fields, '{}')) AND is_active = true;
    UPDATE products SET is_active = true, updated_at = now()
    WHERE sku LIKE 'XBZ-MANUAL-%' AND is_active = false AND is_deleted = false;
  $sql$, 44000, 'fantasmas-guard');
  $cmd$);

SELECT cron.alter_job(195, command := $cmd$
    ANALYZE public.stock_daily_summary;
    ANALYZE public.mv_product_images_audit;
    ANALYZE public.image_backfill_queue;
    ANALYZE public.variant_supplier_sources;
    ANALYZE public.produtos_padronizacao;
    ANALYZE public.product_properties;
    ANALYZE public.xbz_gallery_staging;
    ANALYZE public.xbz_upload_mapping;
    ANALYZE public.supplier_customization_options_raw;
    ANALYZE public.product_tags;
  $cmd$);

SELECT cron.alter_job(53, command := $cmd$
    ANALYZE public.product_images;
    ANALYZE public.product_relationships;
    ANALYZE public.products;
    ANALYZE public.product_variants;
    ANALYZE public.supplier_import_batches;
    ANALYZE public.product_category_assignments;
    ANALYZE public.admin_audit_log;
    ANALYZE public.frontend_telemetry;
    ANALYZE public.supplier_products_raw;
    ANALYZE public.supplier_products_raw_history;
    ANALYZE public.search_analytics;
    ANALYZE public.product_views;
    ANALYZE public.catalog_analytics;
    ANALYZE public.navigation_analytics;
    ANALYZE public.dashboard_insights_cache;
    ANALYZE public.analytics_events;
    ANALYZE public.user_search_history;
    ANALYZE public.pipeline_run_log;
    ANALYZE public.video_validation_log;
    ANALYZE public.product_ai_history;
    ANALYZE public.audit_log_gravacao;
    ANALYZE public.ingestion_run_log;
  $cmd$);

SELECT cron.alter_job(244, command := $cmd$TRUNCATE public.category_ancestors; INSERT INTO public.category_ancestors (descendant_id, ancestor_id, depth) WITH RECURSIVE closure(descendant_id, ancestor_id, depth) AS (SELECT c.id, c.parent_id, 1::smallint FROM categories c WHERE c.parent_id IS NOT NULL UNION ALL SELECT cl.descendant_id, c.parent_id, (cl.depth + 1)::smallint FROM closure cl JOIN categories c ON c.id = cl.ancestor_id WHERE c.parent_id IS NOT NULL AND cl.depth < 10) SELECT descendant_id, ancestor_id, depth FROM closure;$cmd$);
