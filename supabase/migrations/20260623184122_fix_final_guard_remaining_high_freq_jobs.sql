
-- Adicionar guard aos jobs frequentes restantes sem proteção

-- process-pending-products (12x/hora, 29s avg) — CRÍTICO
SELECT cron.unschedule('process-pending-products');
SELECT cron.schedule('process-pending-products', '2,7,12,17,22,27,32,37,42,47,52,57 * * * *',
  'SELECT public.fn_cron_safe_run(88::bigint, ''SELECT public.fn_process_pending_products();'', 290000, ''process-pending'');'
);

-- pipeline-classify-categories (6x/hora)
SELECT cron.unschedule('pipeline-classify-categories');
SELECT cron.schedule('pipeline-classify-categories', '2,12,22,32,42,52 * * * *',
  'SELECT public.fn_cron_safe_run(55::bigint, ''SELECT public.fn_pipeline_classify_pending_products(50);'', 580000, ''pipeline-classify'');'
);

-- medallion-promote-tick (6x/hora)
SELECT cron.unschedule('medallion-promote-tick');
SELECT cron.schedule('medallion-promote-tick', '6,16,26,36,46,56 * * * *',
  'SELECT public.fn_cron_safe_run(59::bigint, ''SELECT public.fn_medallion_promote_tick();'', 580000, ''medallion-promote'');'
);

-- sm-site-scrape (6x/hora)
SELECT cron.unschedule('sm-site-scrape');
SELECT cron.schedule('sm-site-scrape', '4,14,24,34,44,54 * * * *',
  'SELECT public.fn_cron_safe_run(63::bigint, ''SELECT public.fn_sm_site_tick(3, 15, 7, false);'', 580000, ''sm-site-scrape'');'
);

-- xbz-stock-sync (4x/hora)
SELECT cron.unschedule('xbz-stock-sync');
SELECT cron.schedule('xbz-stock-sync', '8,23,38,53 * * * *',
  'SELECT public.fn_cron_safe_run(54::bigint, ''SELECT public.fn_xbz_stock_sync();'', 880000, ''xbz-stock-sync'');'
);

-- asia-image-uploader (3x/hora)
SELECT cron.unschedule('asia-image-uploader');
SELECT cron.schedule('asia-image-uploader', '9,29,49 * * * *',
  'SELECT public.fn_cron_safe_run(77::bigint, ''SELECT public.fn_asia_image_uploader_tick();'', 1160000, ''asia-img-uploader'');'
);
;
