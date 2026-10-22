-- Rollback da migration 20261022193000_incidente_2026_10_22_alivio_carga_cron.
-- Restaura os schedules vigentes em 2026-10-22 (antes do alívio) e a
-- fn_cron_safe_run sem RAISE WARNING. Idempotente; resolve jobs por jobname.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('asia-image-uploader',            '9,29,49 * * * *'),
      ('process-pending-products',       '2,7,12,17,22,27,32,37,42,47,52,57 * * * *'),
      ('fantasmas-deactivate-guard',     '4,9,14,19,24,29,34,39,44,49,54,59 * * * *'),
      ('sm-stock-guard',                 '3,8,13,18,23,28,33,38,43,48,53,58 * * * *'),
      ('sm-variant-coherence-guard',     '2,7,12,17,22,27,32,37,42,47,52,57 * * * *'),
      ('sync-is-stockout-universal',     '0,5,10,15,20,25,30,35,40,45,50,55 * * * *'),
      ('dispatcher-failure-alert',       '*/5 * * * *'),
      ('backfill-image-dimensions',      '2,7,12,17,22,27,32,37,42,47,52,57 * * * *'),
      ('hash-product-images',            '*/5 * * * *'),
      ('xbz-site-scrape',                '1,11,21,31,41,51 * * * *'),
      ('sm-site-scrape',                 '4,14,24,34,44,54 * * * *'),
      ('medallion-promote-tick',         '6,16,26,36,46,56 * * * *'),
      ('xbz-enrich-gold-extractors',     '6,16,26,36,46,56 * * * *'),
      ('xbz-stock-sync',                 '8,23,38,53 * * * *'),
      ('reposicao-backfill-hourly',      '42 * * * *')
    ) AS t(jobname, schedule)
  LOOP
    PERFORM cron.alter_job(j.jobid, schedule := r.schedule)
    FROM cron.job j
    WHERE j.jobname = r.jobname
      AND j.schedule IS DISTINCT FROM r.schedule;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.fn_cron_safe_run(p_key bigint, p_sql text, p_timeout_ms integer DEFAULT 45000, p_job_label text DEFAULT 'cron'::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_start timestamptz := clock_timestamp(); v_duration_ms int;
BEGIN
  IF NOT pg_try_advisory_xact_lock(p_key) THEN
    RETURN format('[%s] SKIP: job ainda em execução (lock=%s)', p_job_label, p_key);
  END IF;
  EXECUTE format('SET LOCAL statement_timeout = %L', p_timeout_ms || 'ms');
  EXECUTE p_sql;
  v_duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start)) * 1000;
  RETURN format('[%s] OK: %sms', p_job_label, v_duration_ms);
EXCEPTION
  WHEN query_canceled THEN
    RETURN format('[%s] TIMEOUT após %sms (limite=%sms)', p_job_label,
      EXTRACT(EPOCH FROM (clock_timestamp() - v_start))::int * 1000, p_timeout_ms);
  WHEN OTHERS THEN
    RETURN format('[%s] ERRO: %s', p_job_label, SQLERRM);
END; $function$;

REVOKE EXECUTE ON FUNCTION public.fn_cron_safe_run(bigint, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_cron_safe_run(bigint, text, integer, text) TO service_role;
