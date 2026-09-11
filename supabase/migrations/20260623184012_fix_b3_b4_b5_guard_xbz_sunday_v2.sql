
-- FIX B3: xbz-image-uploader — advisory lock via fn_cron_safe_run com placeholder
-- Como o job é HTTP (net.http_post), envolvemos apenas o lock
SELECT cron.unschedule('xbz-image-uploader');
SELECT cron.schedule(
  'xbz-image-uploader',
  '3,13,23,33,43,53 * * * *',
  $cmd$SELECT public.fn_cron_safe_run(76::bigint,
    $sql$SELECT net.http_post(
      url := 'https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/xbz-image-uploader',
      headers := jsonb_build_object('Content-Type','application/json',
        'x-cron-secret', public.get_edge_function_secret('XBZ_IMAGE_UPLOADER_CRON_SECRET')),
      body := '{"trigger":"cron"}'::jsonb,
      timeout_milliseconds := 570000)$sql$,
    580000, 'xbz-image-uploader');$cmd$
);

-- FIX B4: xbz-site-scrape
SELECT cron.unschedule('xbz-site-scrape');
SELECT cron.schedule(
  'xbz-site-scrape',
  '1,11,21,31,41,51 * * * *',
  'SELECT public.fn_cron_safe_run(56::bigint, ''SELECT public.fn_xbz_site_scrape_tick();'', 580000, ''xbz-site-scrape'');'
);

-- FIX B5: Distribuir jobs do Domingo 3h00 (eliminar spike de 3+ jobs simultâneos)
SELECT cron.unschedule('vacuum-product-novelties');
SELECT cron.schedule('vacuum-product-novelties', '3 3 * * 0',
  $sql$SELECT public.fn_cron_safe_run(186::bigint,
    'VACUUM ANALYZE public.products; VACUUM ANALYZE public.product_variants;',
    55000, 'vacuum-novelties');$sql$
);

SELECT cron.unschedule('cleanup-log-tables-weekly');
SELECT cron.schedule('cleanup-log-tables-weekly', '7 3 * * 0',
  $sql$SELECT public.fn_cron_safe_run(50::bigint,
    'DELETE FROM public.cron_job_run_details_archive WHERE end_time < now() - interval ''90 days'';',
    44000, 'cleanup-log-weekly');$sql$
);

SELECT cron.unschedule('stock_snapshots_weekly_purge');
SELECT cron.schedule('stock_snapshots_weekly_purge', '11 3 * * 0',
  'SELECT public.fn_cron_safe_run(5::bigint, ''SELECT public.fn_purge_old_stock_snapshots();'', 55000, ''stock-snapshots-purge'');'
);
;
