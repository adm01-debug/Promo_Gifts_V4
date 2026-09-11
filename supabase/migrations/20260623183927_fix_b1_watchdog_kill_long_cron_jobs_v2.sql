
-- FIX: remover duplicata 'sm-stock-guard' antes do INSERT
CREATE TABLE IF NOT EXISTS public.cron_watchdog_log (
  id bigserial PRIMARY KEY, killed_at timestamptz DEFAULT now(),
  pid int, jobname text, query_start timestamptz,
  duration_ms bigint, query_preview text
);
CREATE INDEX IF NOT EXISTS idx_cron_watchdog_killed ON public.cron_watchdog_log(killed_at DESC);

CREATE TABLE IF NOT EXISTS public.cron_job_timeout_map (
  jobname text PRIMARY KEY, timeout_sec int NOT NULL DEFAULT 55, description text
);

INSERT INTO public.cron_job_timeout_map (jobname, timeout_sec, description) VALUES
  ('sync-is-stockout-universal', 44, 'SQL: sync stockout'),
  ('auto-block-offenders', 44, 'SQL: block offenders'),
  ('sm-variant-coherence-guard', 44, 'SQL: variant guard'),
  ('sm-stock-guard', 44, 'SQL: stock guard'),
  ('fantasmas-deactivate-guard', 44, 'SQL: ghost guard'),
  ('backfill-image-dimensions', 50, 'HTTP: image backfill'),
  ('generate-blurhashes', 50, 'HTTP: blurhashes'),
  ('hash-product-images', 50, 'HTTP: hash images'),
  ('connections-health-check', 25, 'HTTP: health check'),
  ('purge-expired-security', 44, 'SQL: purge security'),
  ('connections-auto-test', 25, 'HTTP: auto test'),
  ('refresh-mv-supplier-reliability', 44, 'SQL: refresh MV'),
  ('sm-category-enqueue', 44, 'SQL: category enqueue'),
  ('sm-category-collect', 44, 'SQL: category collect'),
  ('video-recover-stuck', 44, 'SQL: video recover'),
  ('pipeline-print-profiles', 44, 'SQL: print profiles'),
  ('process-queue', 50, 'HTTP: process queue'),
  ('xbz-enrich-gold-extractors', 44, 'SQL: xbz enrich'),
  ('sm-url-discover-search', 44, 'SQL: sm url search'),
  ('sm-url-discover-collect', 44, 'SQL: sm url collect'),
  ('cleanup-stale-ai-pending-logs', 15, 'SQL: cleanup logs'),
  ('xbz-image-uploader', 580, 'HTTP: xbz images (9.7min window)'),
  ('xbz-site-scrape', 580, 'HTTP: xbz scrape'),
  ('asia-stock-sync', 880, 'HTTP: asia stock (14.7min window)'),
  ('process-pending-products', 290, 'SQL: pending products (4.8min window)'),
  ('refresh-all-materialized-views', 55, 'SQL: refresh MVs'),
  ('refresh-mv-ema-kpi-by-level', 55, 'SQL: ema kpi MV'),
  ('refresh-mv-stock-rupture-alert', 55, 'SQL: stock rupture MV')
ON CONFLICT (jobname) DO UPDATE
  SET timeout_sec = EXCLUDED.timeout_sec, description = EXCLUDED.description;

CREATE OR REPLACE FUNCTION public.fn_cron_watchdog()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_killed int := 0; v_result jsonb; v_rec record;
BEGIN
  FOR v_rec IN
    SELECT a.pid, a.query, a.query_start,
      ROUND(EXTRACT(EPOCH FROM (now() - a.query_start)) * 1000)::bigint AS duration_ms,
      (regexp_match(a.query, '''([^'']+)'''))[1] AS job_label,
      COALESCE(
        (SELECT m.timeout_sec FROM public.cron_job_timeout_map m
         WHERE a.query ILIKE '%' || m.jobname || '%' LIMIT 1), 55
      ) AS timeout_sec
    FROM pg_stat_activity a
    WHERE a.application_name = 'pg_cron' AND a.state = 'active'
      AND a.query_start IS NOT NULL
      AND a.query NOT ILIKE '%fn_cron_watchdog%'
      AND a.pid != pg_backend_pid()
  LOOP
    IF v_rec.duration_ms > (v_rec.timeout_sec * 1000) THEN
      INSERT INTO public.cron_watchdog_log
        (pid, jobname, query_start, duration_ms, query_preview)
      VALUES (v_rec.pid, COALESCE(v_rec.job_label,'unknown'),
              v_rec.query_start, v_rec.duration_ms, LEFT(v_rec.query,200));
      PERFORM pg_cancel_backend(v_rec.pid);
      v_killed := v_killed + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('killed', v_killed, 'action',
    CASE WHEN v_killed > 0 THEN 'KILLED:'||v_killed ELSE 'ALL_OK' END);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END; $$;

-- Integrar watchdog no snapshot monitor
CREATE OR REPLACE FUNCTION public.fn_capture_connection_snapshot()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total int; v_active int; v_idle_tx int; v_max int;
  v_pct numeric(5,2); v_top_users jsonb; v_watchdog jsonb;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE state='active'),
    COUNT(*) FILTER (WHERE state='idle in transaction'),
    (SELECT setting::int FROM pg_settings WHERE name='max_connections')
  INTO v_total, v_active, v_idle_tx, v_max
  FROM pg_stat_activity WHERE pid != pg_backend_pid();

  v_pct := ROUND((v_total::numeric / NULLIF(v_max,0)) * 100, 2);

  SELECT jsonb_agg(row_to_json(t)) INTO v_top_users
  FROM (SELECT usename, state, COUNT(*) n FROM pg_stat_activity
        WHERE pid != pg_backend_pid()
        GROUP BY usename, state ORDER BY n DESC LIMIT 8) t;

  INSERT INTO public.db_connection_snapshots
    (total_conns, active_conns, idle_in_tx_conns, max_conns, usage_pct, top_users, alert_sent)
  VALUES (v_total, v_active, v_idle_tx, v_max, v_pct, v_top_users, v_pct >= 75);

  DELETE FROM public.db_connection_snapshots
  WHERE captured_at < now() - interval '7 days';

  -- Rodar watchdog integrado
  v_watchdog := public.fn_cron_watchdog();

  RETURN jsonb_build_object(
    'total', v_total, 'active', v_active, 'idle_in_tx', v_idle_tx,
    'usage_pct', v_pct, 'alert', v_pct >= 75, 'watchdog', v_watchdog
  );
END; $$;

COMMENT ON FUNCTION public.fn_cron_watchdog IS
  'Watchdog externo para enforcement de timeouts em cron jobs. '
  'Cancela gracefully (pg_cancel_backend) jobs que excederam timeout de cron_job_timeout_map. '
  'Executado a cada minuto via fn_capture_connection_snapshot → monitor-connections.';
;
