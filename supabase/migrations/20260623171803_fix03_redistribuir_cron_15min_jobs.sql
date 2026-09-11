
-- =============================================================
-- FIX #03: Redistribuição dos 8 jobs */15
-- ANTES: todos em :00,:15,:30,:45 (colidem entre si e com */5)
-- DEPOIS: offsets 3,6,8,9,11,12,13,14 — nunca mais colidem
-- =============================================================

-- JOB 19: connections-health-check → 3,18,33,48
SELECT cron.unschedule('connections-health-check');
SELECT cron.schedule('connections-health-check', '3,18,33,48 * * * *',
  $$SELECT net.http_post(url:='https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/connections-health-check',headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',public.get_edge_function_secret('CRON_SECRET')),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$$
);

-- JOB 22: purge-expired-security → 6,21,36,51
SELECT cron.unschedule('purge-expired-security');
SELECT cron.schedule('purge-expired-security', '6,21,36,51 * * * *',
  'SELECT public.fn_cron_safe_run(22::bigint, ''SELECT public.purge_expired_security_data();'', 44000, ''purge-security'');'
);

-- JOB 48: connections-auto-test → 9,24,39,54
SELECT cron.unschedule('connections-auto-test');
SELECT cron.schedule('connections-auto-test', '9,24,39,54 * * * *',
  $$SELECT net.http_post(url:='https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/connections-auto-test',headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',public.get_edge_function_secret('CRON_SECRET')),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=30000)$$
);

-- JOB 151: refresh-mv-supplier-reliability → 8,23,38,53
SELECT cron.unschedule('refresh-mv-supplier-reliability');
SELECT cron.schedule('refresh-mv-supplier-reliability', '8,23,38,53 * * * *',
  'SELECT public.fn_cron_safe_run(151::bigint, ''REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_supplier_reliability;'', 44000, ''mv-supplier-reliability'');'
);

-- JOB 68: sm-category-enqueue → 11,26,41,56
SELECT cron.unschedule('sm-category-enqueue');
SELECT cron.schedule('sm-category-enqueue', '11,26,41,56 * * * *',
  'SELECT public.fn_cron_safe_run(68::bigint, ''SELECT public.fn_sm_category_enqueue(3);'', 44000, ''sm-cat-enqueue'');'
);

-- JOB 69: sm-category-collect → 12,27,42,57
SELECT cron.unschedule('sm-category-collect');
SELECT cron.schedule('sm-category-collect', '12,27,42,57 * * * *',
  'SELECT public.fn_cron_safe_run(69::bigint, ''SELECT public.fn_sm_category_collect(10);'', 44000, ''sm-cat-collect'');'
);

-- JOB 86: video-recover-stuck → 13,28,43,58
SELECT cron.unschedule('video-recover-stuck');
SELECT cron.schedule('video-recover-stuck', '13,28,43,58 * * * *',
  'SELECT public.fn_cron_safe_run(86::bigint, ''SELECT public.fn_video_queue_recover_stuck();'', 44000, ''video-recover'');'
);

-- JOB 87: pipeline-print-profiles → 14,29,44,59
SELECT cron.unschedule('pipeline-print-profiles');
SELECT cron.schedule('pipeline-print-profiles', '14,29,44,59 * * * *',
  'SELECT public.fn_cron_safe_run(87::bigint, ''SELECT public.fn_apply_print_profiles(300, false);'', 44000, ''print-profiles'');'
);
;
