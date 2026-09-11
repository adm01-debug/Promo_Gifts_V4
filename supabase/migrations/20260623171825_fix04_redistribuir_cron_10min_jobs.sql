
-- =============================================================
-- FIX #04: Redistribuição dos jobs */10 e */5 HTTP
-- ANTES: :00,:10,:20,:30,:40,:50 (pilha com outros)
-- DEPOIS: offsets distribuídos
-- =============================================================

-- JOB 14: process-queue → mover para 4,14,24,34,44,54 (evita :00)
SELECT cron.unschedule('process-queue');
SELECT cron.schedule('process-queue', '4,14,24,34,44,54 * * * *',
  $$SELECT net.http_post(url:='https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/process-queue',headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',public.get_edge_function_secret('CRON_SECRET')),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$$
);

-- JOB 62: xbz-enrich-gold-extractors → mover para 5,15,25,35,45,55 (evita :00)
SELECT cron.unschedule('xbz-enrich-gold-extractors');
SELECT cron.schedule('xbz-enrich-gold-extractors', '5,15,25,35,45,55 * * * *',
  'SELECT public.fn_cron_safe_run(62::bigint, ''SELECT public.fn_xbz_enrich_gold_extractors(p_only_missing => true, p_limit => 200);'', 44000, ''xbz-enrich-gold'');'
);

-- JOB 66: sm-url-discover-search → 5,15,25,35,45,55
SELECT cron.unschedule('sm-url-discover-search');
SELECT cron.schedule('sm-url-discover-search', '5,15,25,35,45,55 * * * *',
  'SELECT public.fn_cron_safe_run(66::bigint, ''SELECT public.fn_sm_url_discover_via_search(3);'', 44000, ''sm-url-search'');'
);

-- JOB 67: sm-url-discover-collect → 7,17,27,37,47,57
SELECT cron.unschedule('sm-url-discover-collect');
SELECT cron.schedule('sm-url-discover-collect', '7,17,27,37,47,57 * * * *',
  'SELECT public.fn_cron_safe_run(67::bigint, ''SELECT public.fn_sm_url_discover_collect(20);'', 44000, ''sm-url-collect'');'
);

-- JOB 149: cleanup-stale-ai-pending-logs → 3,13,23,33,43,53
SELECT cron.unschedule('cleanup-stale-ai-pending-logs');
SELECT cron.schedule('cleanup-stale-ai-pending-logs', '3,13,23,33,43,53 * * * *',
  $$SELECT public.fn_cron_safe_run(149::bigint, $sql$
    UPDATE public.ai_usage_logs SET status='error', error_message='orphaned_pending: isolate killed before updateAiLog ran'
    WHERE status='pending' AND created_at < NOW() - INTERVAL '5 minutes';
  $sql$, 15000, 'ai-log-cleanup');$$
);

-- JOB 133: backfill-image-dimensions */5 HTTP → offset 2,7,12... (fora do :00)
SELECT cron.unschedule('backfill-image-dimensions');
SELECT cron.schedule('backfill-image-dimensions', '2,7,12,17,22,27,32,37,42,47,52,57 * * * *',
  $$SELECT net.http_post(
    url := public.get_edge_functions_base_url() || '/functions/v1/backfill-image-dimensions',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',public.get_edge_function_secret('BACKFILL_DIM_CRON_SECRET')),
    body := '{"trigger":"cron"}'::jsonb,
    timeout_milliseconds := 55000)$$
);
;
