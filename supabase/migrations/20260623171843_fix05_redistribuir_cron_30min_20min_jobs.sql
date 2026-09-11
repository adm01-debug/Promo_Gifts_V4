
-- =============================================================
-- FIX #05: Redistribuição dos jobs */30 e */20
-- ANTES: :00,:30 e :00,:20,:40 (todos colidem no :00)
-- DEPOIS: offsets únicos, nunca :00
-- =============================================================

-- JOB 64: sm-site-scrape-auth */20 → 17,37,57 (evita :00, :20, :40)
SELECT cron.unschedule('sm-site-scrape-auth');
SELECT cron.schedule('sm-site-scrape-auth', '17,37,57 * * * *',
  'SELECT public.fn_cron_safe_run(64::bigint, ''SELECT public.fn_sm_site_tick(3, 15, 7, true);'', 44000, ''sm-site-auth'');'
);

-- JOB 89: asia-enqueue-new-products */30 → 19,49
SELECT cron.unschedule('asia-enqueue-new-products');
SELECT cron.schedule('asia-enqueue-new-products', '19,49 * * * *',
  'SELECT public.fn_cron_safe_run(89::bigint, ''SELECT fn_asia_enqueue_primary_url_images();'', 44000, ''asia-enqueue-imgs'');'
);

-- JOB 91: spot-relink-family-images */30 → 22,52
SELECT cron.unschedule('spot-relink-family-images');
SELECT cron.schedule('spot-relink-family-images', '22,52 * * * *',
  'SELECT public.fn_cron_safe_run(91::bigint, ''SELECT fn_spot_relink_family_images();'', 44000, ''spot-relink-imgs'');'
);

-- JOB 102: kit-component-auto-approve */30 → 26,56
SELECT cron.unschedule('kit-component-auto-approve');
SELECT cron.schedule('kit-component-auto-approve', '26,56 * * * *',
  'SELECT public.fn_cron_safe_run(102::bigint, ''SELECT fn_kit_auto_approve_high_confidence();'', 44000, ''kit-auto-approve'');'
);

-- JOB 126: qa-imageless-products */30 → 29,59
SELECT cron.unschedule('qa-imageless-products');
SELECT cron.schedule('qa-imageless-products', '29,59 * * * *',
  'SELECT public.fn_cron_safe_run(126::bigint, ''SELECT fn_qa_scan_imageless_products();'', 44000, ''qa-imageless'');'
);
;
