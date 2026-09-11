
-- =============================================================
-- FIX #15: Eliminar pico nos minutos :07 e :37
-- sm-url-discover-collect e sm-site-scrape-auth colidem com asia-stock-sync e spot-stock-fast-sync
-- =============================================================

-- sm-url-discover-collect: 7,17,27,37,47,57 → 8,18,28,38,48,58 (shift +1)
SELECT cron.unschedule('sm-url-discover-collect');
SELECT cron.schedule('sm-url-discover-collect', '8,18,28,38,48,58 * * * *',
  'SELECT public.fn_cron_safe_run(67::bigint, ''SELECT public.fn_sm_url_discover_collect(20);'', 44000, ''sm-url-collect'');'
);

-- sm-site-scrape-auth: 17,37,57 → 19,39,59 (shift +2)
SELECT cron.unschedule('sm-site-scrape-auth');
SELECT cron.schedule('sm-site-scrape-auth', '19,39,59 * * * *',
  'SELECT public.fn_cron_safe_run(64::bigint, ''SELECT public.fn_sm_site_tick(3, 15, 7, true);'', 44000, ''sm-site-auth'');'
);

-- spot-stock-fast-sync: 7,37 → 10,40 (evita bater com asia-stock-sync e sm-variant)
SELECT cron.unschedule('spot-stock-fast-sync');
SELECT cron.schedule('spot-stock-fast-sync', '10,40 * * * *',
  'SELECT public.fn_cron_safe_run(109::bigint, ''SELECT public.fn_spot_stock_fast_sync();'', 44000, ''spot-stock-fast'');'
);

-- xbz-enrich-gold-extractors: 5,15,25,35,45,55 (igual ao sm-url-discover-search!) → 6,16,26,36,46,56
SELECT cron.unschedule('xbz-enrich-gold-extractors');
SELECT cron.schedule('xbz-enrich-gold-extractors', '6,16,26,36,46,56 * * * *',
  'SELECT public.fn_cron_safe_run(62::bigint, ''SELECT public.fn_xbz_enrich_gold_extractors(p_only_missing => true, p_limit => 200);'', 44000, ''xbz-enrich-gold'');'
);

-- cleanup-stale-ai-pending-logs: 3,13,23,33,43,53 (bate com xbz-image-uploader!) → 4,14,24,34,44,54
-- NOTA: 4,14,24,34,44,54 bate com process-queue e sm-site-scrape. Mudar para 3 jobs max é aceitável.
-- Manter em 3,13,23... pois são leves (UPDATE simples)

-- Redistribuição do refresh-mv-stock-rupture-alert: 15 * → já OK em :15
-- Redistribuição do refresh-mv-ema-kpi-by-level: 16 * → já OK em :16
;
