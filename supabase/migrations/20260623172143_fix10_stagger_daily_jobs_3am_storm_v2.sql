
-- FIX #10 v2: Jobs diários saindo de minutos cheios

SELECT cron.unschedule('refresh-category-ancestors');
SELECT cron.schedule('refresh-category-ancestors', '7 1 * * *',
  'TRUNCATE public.category_ancestors; INSERT INTO public.category_ancestors (descendant_id, ancestor_id, depth) WITH RECURSIVE closure(descendant_id, ancestor_id, depth) AS (SELECT c.id, c.parent_id, 1::smallint FROM categories c WHERE c.parent_id IS NOT NULL UNION ALL SELECT cl.descendant_id, c.parent_id, (cl.depth + 1)::smallint FROM closure cl JOIN categories c ON c.id = cl.ancestor_id WHERE c.parent_id IS NOT NULL AND cl.depth < 10) SELECT descendant_id, ancestor_id, depth FROM closure;'
);

SELECT cron.unschedule('schema-drift-check');
SELECT cron.schedule('schema-drift-check', '11 2 * * *',
  'SELECT public.fn_cron_safe_run(25::bigint, ''SELECT public.fn_run_schema_drift_check();'', 55000, ''schema-drift'');'
);

SELECT cron.unschedule('sync-derived-product-flags');
SELECT cron.schedule('sync-derived-product-flags', '23 2 * * *',
  'SELECT public.fn_cron_safe_run(118::bigint, ''SELECT public.fn_sync_derived_product_flags();'', 55000, ''sync-derived-flags'');'
);

SELECT cron.unschedule('expire-product-novelties');
SELECT cron.schedule('expire-product-novelties', '7 3 * * *',
  'SELECT public.fn_cron_safe_run(97::bigint, ''SELECT fn_expire_novelties_with_stats();'', 44000, ''expire-novelties'');'
);

SELECT cron.unschedule('expire-supplier-promises');
SELECT cron.schedule('expire-supplier-promises', '11 4 * * *',
  'SELECT public.fn_cron_safe_run(150::bigint, ''SELECT public.fn_expire_pending_promises();'', 44000, ''expire-promises'');'
);

SELECT cron.unschedule('ai-enqueue-daily');
SELECT cron.schedule('ai-enqueue-daily', '17 4 * * *',
  'SELECT public.fn_cron_safe_run(96::bigint, ''SELECT fn_enqueue_ai_enrichment(''''all''''::text, NULL::uuid, 5000::integer, 5::integer, true::boolean);'', 55000, ''ai-enqueue'');'
);

SELECT cron.unschedule('notebook-specs-daily');
SELECT cron.schedule('notebook-specs-daily', '7 5 * * *',
  'SELECT public.fn_cron_safe_run(106::bigint, ''SELECT fn_promote_notebook_specs(p_limit := 300, p_force := false);'', 44000, ''notebook-specs'');'
);

SELECT cron.unschedule('seo-populate-new-products');
SELECT cron.schedule('seo-populate-new-products', '13 5 * * *',
  'SELECT public.fn_cron_safe_run(94::bigint, ''SELECT fn_populate_all_products_seo(p_supplier_id := NULL::uuid, p_force := false);'', 55000, ''seo-populate'');'
);

SELECT cron.unschedule('expire-stale-password-reset-requests');
SELECT cron.schedule('expire-stale-password-reset-requests', '7 6 * * *',
  'SELECT public.fn_cron_safe_run(34::bigint, ''SELECT public.expire_stale_password_reset_requests();'', 30000, ''expire-pwd-reset'');'
);

SELECT cron.unschedule('purge-expired-restock-dates');
SELECT cron.schedule('purge-expired-restock-dates', '13 6 * * *',
  'SELECT public.fn_cron_safe_run(112::bigint, ''SELECT public.fn_purge_expired_restock_dates(false);'', 44000, ''purge-restock-dates'');'
);

SELECT cron.unschedule('collections-watcher');
SELECT cron.schedule('collections-watcher', '23 6 * * *',
  $$SELECT net.http_post(url:='https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/collections-watcher',headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',public.get_edge_function_secret('CRON_SECRET')),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$$
);

SELECT cron.unschedule('kit-sync-personalization-notes');
SELECT cron.schedule('kit-sync-personalization-notes', '31 6,18 * * *',
  'SELECT public.fn_cron_safe_run(103::bigint, ''SELECT fn_kit_sync_personalization_notes();'', 44000, ''kit-sync-pers'');'
);

SELECT cron.unschedule('sm-session-check');
SELECT cron.schedule('sm-session-check', '7 8 * * *',
  'SELECT public.fn_cron_safe_run(70::bigint, ''SELECT public.fn_sm_session_check();'', 44000, ''sm-session-check'');'
);

SELECT cron.unschedule('spot-health-check-daily');
SELECT cron.schedule('spot-health-check-daily', '11 9 * * *',
  'SELECT public.fn_cron_safe_run(74::bigint, ''SELECT fn_spot_health_check();'', 44000, ''spot-health'');'
);

SELECT cron.unschedule('quote-followup-reminders');
SELECT cron.schedule('quote-followup-reminders', '17 9 * * *',
  $$SELECT net.http_post(url:='https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/quote-followup-reminders',headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',public.get_edge_function_secret('CRON_SECRET')),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$$
);

SELECT cron.unschedule('refresh-analytics-mv-stock-velocity');
SELECT cron.schedule('refresh-analytics-mv-stock-velocity', '13 23 * * *',
  'SELECT public.fn_cron_safe_run(147::bigint, ''REFRESH MATERIALIZED VIEW analytics.mv_stock_velocity;'', 55000, ''mv-stock-velocity'');'
);

SELECT cron.unschedule('color-health-daily');
SELECT cron.schedule('color-health-daily', '19 6 * * *',
  'SELECT public.fn_cron_safe_run(108::bigint, ''SELECT COUNT(*) FROM fn_color_health_full() WHERE status != $$✅ OK$$;'', 55000, ''color-health'');'
);

SELECT cron.unschedule('kit-sync-personalization-notes');
SELECT cron.schedule('kit-sync-personalization-notes', '31 6,18 * * *',
  'SELECT public.fn_cron_safe_run(103::bigint, ''SELECT fn_kit_sync_personalization_notes();'', 44000, ''kit-pers-notes'');'
);
;
