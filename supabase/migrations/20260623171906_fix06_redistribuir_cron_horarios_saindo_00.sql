
-- =============================================================
-- FIX #06: Jobs horários saindo do :00
-- Todos tinham "0 * * * *" — contribuíam para os 66 jobs no :00
-- =============================================================

-- JOB 24: cleanup-edge-rate-limits → 37 * * * *
SELECT cron.unschedule('cleanup-edge-rate-limits');
SELECT cron.schedule('cleanup-edge-rate-limits', '37 * * * *',
  'SELECT public.fn_cron_safe_run(24::bigint, ''SELECT public.cleanup_expired_edge_rate_limits();'', 30000, ''cleanup-edge-rl'');'
);

-- JOB 38: cleanup-expired-token-revocations → 43 * * * *
SELECT cron.unschedule('cleanup-expired-token-revocations');
SELECT cron.schedule('cleanup-expired-token-revocations', '43 * * * *',
  $$SELECT public.fn_cron_safe_run(38::bigint, $sql$
    DELETE FROM user_token_revocations
    WHERE (expires_at IS NOT NULL AND expires_at < now() - interval '5 minutes')
       OR (expires_at IS NULL AND revoked_at < now() - interval '30 days');
  $sql$, 30000, 'cleanup-token-revoc');$$
);

-- JOB 101: kit-component-auto-promote → 46 * * * *
SELECT cron.unschedule('kit-component-auto-promote');
SELECT cron.schedule('kit-component-auto-promote', '46 * * * *',
  'SELECT public.fn_cron_safe_run(101::bigint, ''SELECT fn_kit_auto_promote_approved();'', 44000, ''kit-auto-promote'');'
);

-- JOB 121: dashboard-insights-cache-cleanup → 48 * * * *
SELECT cron.unschedule('dashboard-insights-cache-cleanup');
SELECT cron.schedule('dashboard-insights-cache-cleanup', '48 * * * *',
  'SELECT public.fn_cron_safe_run(121::bigint, ''DELETE FROM public.dashboard_insights_cache WHERE expires_at < now();'', 20000, ''dash-cache-cleanup'');'
);

-- JOB 127: qa-image-coverage-hourly → 51 * * * *
SELECT cron.unschedule('qa-image-coverage-hourly');
SELECT cron.schedule('qa-image-coverage-hourly', '51 * * * *',
  'SELECT public.fn_cron_safe_run(127::bigint, ''SELECT public.fn_qa_check_image_coverage();'', 44000, ''qa-img-coverage'');'
);

-- JOB 154: ai-queue-stuck-cleanup → 34 * * * *
SELECT cron.unschedule('ai-queue-stuck-cleanup');
SELECT cron.schedule('ai-queue-stuck-cleanup', '34 * * * *',
  $$SELECT public.fn_cron_safe_run(154::bigint, $sql$
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
  $sql$, 30000, 'ai-queue-stuck');$$
);

-- JOB 47: refresh-all-materialized-views (estava em 30 * * * *) → 38 * * * *
SELECT cron.unschedule('refresh-all-materialized-views');
SELECT cron.schedule('refresh-all-materialized-views', '38 * * * *',
  'SELECT public.fn_cron_safe_run(47::bigint, ''SELECT public.refresh_all_materialized_views();'', 55000, ''refresh-all-mvs'');'
);
;
