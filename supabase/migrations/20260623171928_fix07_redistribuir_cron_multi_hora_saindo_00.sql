
-- =============================================================
-- FIX #07: Jobs com "0 */N * * *" e horários fixos no :00
-- =============================================================

-- JOB 123: image-dimensions-backfill "0 */3 * * *" → "31 */3 * * *"
SELECT cron.unschedule('image-dimensions-backfill');
SELECT cron.schedule('image-dimensions-backfill', '31 */3 * * *',
  $$SELECT net.http_post(
    url := 'https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/run-script',
    body := '{"script":"image-dimensions-worker"}'::jsonb)$$
);

-- JOB 136: refresh-backfill-queue-expiry "0 */4 * * *" → "33 */4 * * *"
SELECT cron.unschedule('refresh-backfill-queue-expiry');
SELECT cron.schedule('refresh-backfill-queue-expiry', '33 */4 * * *',
  $$SELECT public.fn_cron_safe_run(136::bigint, $sql$
    UPDATE image_backfill_queue SET created_at = NOW()
    WHERE status = 'pending' AND created_at <= NOW() - INTERVAL '22 hours';
  $sql$, 30000, 'backfill-queue-expiry');$$
);

-- JOB 143: refresh-mv-product-leaf-category "0 */4 * * *" → "37 */4 * * *"
SELECT cron.unschedule('refresh-mv-product-leaf-category');
SELECT cron.schedule('refresh-mv-product-leaf-category', '37 */4 * * *',
  'SELECT public.fn_cron_safe_run(143::bigint, ''REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_product_leaf_category;'', 55000, ''mv-leaf-category'');'
);

-- JOB 124: refresh-mv-product-images-audit "0 */6 * * *" → "42 */6 * * *"
SELECT cron.unschedule('refresh-mv-product-images-audit');
SELECT cron.schedule('refresh-mv-product-images-audit', '42 */6 * * *',
  'SELECT public.fn_cron_safe_run(124::bigint, ''REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_product_images_audit;'', 55000, ''mv-imgs-audit'');'
);

-- JOB 110: pre-generate-market-insights "0 1,7,13,19 * * *" → "44 1,7,13,19 * * *"
SELECT cron.unschedule('pre-generate-market-insights');
SELECT cron.schedule('pre-generate-market-insights', '44 1,7,13,19 * * *',
  'SELECT public.fn_cron_safe_run(110::bigint, $$SELECT public.fn_generate_market_insights_cache(''75921d8b-611f-4413-9ce5-afccdb733d26''::uuid, 30);$$, 55000, ''market-insights-cache'');'
);

-- JOB 153: refresh-mv-ema-kpi-by-level "16 */1 * * *" → já é :16, só adicionar guard
SELECT cron.unschedule('refresh-mv-ema-kpi-by-level');
SELECT cron.schedule('refresh-mv-ema-kpi-by-level', '16 * * * *',
  'SELECT public.fn_cron_safe_run(153::bigint, ''REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_ema_kpi_by_level;'', 55000, ''mv-ema-kpi'');'
);

-- JOB 148: refresh-mv-stock-rupture-alert "15 */1 * * *" → :15 com guard
SELECT cron.unschedule('refresh-mv-stock-rupture-alert');
SELECT cron.schedule('refresh-mv-stock-rupture-alert', '15 * * * *',
  'SELECT public.fn_cron_safe_run(148::bigint, ''REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_stock_rupture_alert;'', 55000, ''mv-stock-rupture'');'
);
;
