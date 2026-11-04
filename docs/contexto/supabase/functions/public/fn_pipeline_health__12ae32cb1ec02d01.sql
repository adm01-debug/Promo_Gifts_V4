CREATE OR REPLACE FUNCTION public.fn_pipeline_health()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'checked_at', now(),
    'raw_pending_total',  (SELECT count(*) FROM supplier_products_raw WHERE status='pending'),
    'raw_failed_total',   (SELECT count(*) FROM supplier_products_raw WHERE status='failed'),
    'raw_quarantined_total', (SELECT count(*) FROM supplier_products_raw WHERE status='quarantined'),
    'raw_pending_by_supplier', COALESCE((
        SELECT jsonb_object_agg(code, n) FROM (
          SELECT s.code, count(*) n FROM supplier_products_raw r JOIN suppliers s ON s.id = r.supplier_id
          WHERE r.status='pending' GROUP BY s.code) a), '{}'::jsonb),
    'raw_failed_by_supplier', COALESCE((
        SELECT jsonb_object_agg(code, n) FROM (
          SELECT s.code, count(*) n FROM supplier_products_raw r JOIN suppliers s ON s.id = r.supplier_id
          WHERE r.status IN ('failed','quarantined') GROUP BY s.code) a), '{}'::jsonb),
    'images_pending',  (SELECT count(*) FROM supplier_products_raw WHERE images_status='pending'),
    'stock_pending',   (SELECT count(*) FROM supplier_products_raw WHERE stock_status='pending'),
    'site_failed',     (SELECT count(*) FROM supplier_products_raw WHERE site_status='failed'),
    'site_pending',    (SELECT count(*) FROM supplier_products_raw WHERE site_status='pending'),
    'pad_standardized_pending', (SELECT count(*) FROM produtos_padronizacao WHERE status='standardized'),
    'pad_oldest_standardized',  (SELECT min(updated_at) FROM produtos_padronizacao WHERE status='standardized'),
    'pad_promoted',             (SELECT count(*) FROM produtos_padronizacao WHERE status='promoted'),
    'gold_products',        (SELECT count(*) FROM products),
    'gold_products_ativos', (SELECT count(*) FROM products WHERE is_active),
    'gold_variants',        (SELECT count(*) FROM product_variants),
    'gold_ativos_sem_imagem',    (SELECT count(*) FROM products p WHERE p.is_active
                                    AND NOT EXISTS (SELECT 1 FROM product_images i WHERE i.product_id=p.id)),
    'gold_ativos_sem_variante',  (SELECT count(*) FROM products p WHERE p.is_active
                                    AND NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id=p.id)),
    'gold_preco_estagnado_7d',   (SELECT count(*) FROM products WHERE is_active
                                    AND (price_verified_at IS NULL OR price_verified_at < now()-INTERVAL '7 days')),
    'estoque_divergente_variantes', (SELECT count(*) FROM (
        SELECT v.id FROM product_variants v
        LEFT JOIN variant_supplier_sources s ON s.variant_id=v.id AND s.is_active
        WHERE v.is_active GROUP BY v.id, v.stock_quantity
        HAVING COALESCE(v.stock_quantity,0) IS DISTINCT FROM COALESCE(sum(s.quantity),0)) z),
    'history_rows_24h', (SELECT count(*) FROM supplier_products_raw_history
                          WHERE captured_at > now()-INTERVAL '24 hours'),
    'last_tick', (
        SELECT to_jsonb(t) FROM (
          SELECT started_at, finished_at, status, duration_s,
                 result->>'pais_promovidos' AS pais, result->>'variantes_promovidas' AS vars,
                 result->>'erros' AS erros
          FROM pipeline_run_log WHERE job='promote_tick' AND status <> 'running'
          ORDER BY started_at DESC LIMIT 1) t),
    'ticks_last_24h',   (SELECT count(*) FROM pipeline_run_log
                        WHERE job='promote_tick' AND started_at > now()-INTERVAL '24 hours'),
    'errors_last_24h',  (SELECT COALESCE(sum((result->>'erros')::int),0) FROM pipeline_run_log
                        WHERE job='promote_tick' AND started_at > now()-INTERVAL '24 hours'
                          AND result->>'_bug_note' IS NULL),
    'errors_historical_fixed', (SELECT count(*) FROM pipeline_run_log
                                WHERE job='promote_tick' AND result->>'_bug_note' IS NOT NULL),
    'novelties', jsonb_build_object(
        'total_active',     (SELECT count(*) FROM product_novelties WHERE is_active = true),
        'total_highlighted',(SELECT count(*) FROM product_novelties WHERE is_active = true AND is_highlighted = true),
        'expiring_7d',      (SELECT count(*) FROM product_novelties WHERE is_active = true AND expires_at IS NOT NULL
                             AND expires_at BETWEEN now() AND now() + INTERVAL '7 days'),
        'stale_is_new',     (SELECT count(*) FROM products WHERE is_new = true AND novelty_expires_at IS NOT NULL
                             AND novelty_expires_at < now()),
        'by_supplier',      COALESCE((
            SELECT jsonb_object_agg(supplier_code, n) FROM (
              SELECT supplier_code, count(*) n FROM product_novelties
              WHERE is_active = true AND supplier_code IS NOT NULL GROUP BY supplier_code) a), '{}'::jsonb),
        'by_source',        COALESCE((
            SELECT jsonb_object_agg(source, n) FROM (
              SELECT source, count(*) n FROM product_novelties
              WHERE is_active = true AND source IS NOT NULL GROUP BY source) a), '{}'::jsonb),
        'last_sync', (SELECT max(updated_at) FROM product_novelties)
    )
  );
$function$
