-- Migration: 20261027140000_stagger_cron_burst_schedules.sql
-- PROBLEMA: 27 falhas "job startup timeout" por dia. Causa: max_running_jobs=32 com
-- burst de jobs simultâneos. Cluster mais crítico: 5-6 jobs no mesmo minuto:
--   • :03/:18/:33/:48 — cleanup-stale-ai-pending-logs + connections-health-check +
--     reconcile-category-products-count + sm-stock-guard (4 jobs) + xbz-image-uploader
--     no :03/:33 = 5 simultâneos
--   • :48 — os 4 acima + sm-url-discover-collect + dashboard-insights-cache-cleanup = 6 simultâneos
--   • :00/:15/:30/:45 — anon-insert-rate-purge + backfill-queue-reap-stuck +
--     sync-is-stockout-universal = 3 simultâneos
-- FIX: distribuir os clusters para minutos adjacentes, reduzindo pico de 6→2 jobs.
-- Evidência: auditoria 2026-10-27 — SELECT jobname,schedule FROM cron.job
-- Rollback: reverter para os schedules originais listados abaixo:
--   anon-insert-rate-purge       */15 * * * *
--   backfill-queue-reap-stuck    */15 * * * *
--   connections-health-check     3,18,33,48 * * * *
--   reconcile-category-products  3,18,33,48 * * * *
--   sm-stock-guard               3,18,33,48 * * * *

DO $$
DECLARE
  v_missing text[];
  v_jobid   bigint;
  v_bad     text[];
BEGIN
  -- Guard: se algum dos 5 jobs não existe (ambiente sem pg_cron) → migration é no-op
  SELECT ARRAY_AGG(n) INTO v_missing
  FROM UNNEST(ARRAY[
    'anon-insert-rate-purge',
    'backfill-queue-reap-stuck',
    'connections-health-check',
    'reconcile-category-products-count',
    'sm-stock-guard'
  ]) n
  WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = n);

  IF v_missing IS NOT NULL THEN
    RAISE NOTICE 'jobs não encontrados em cron.job: % — migration sem efeito neste ambiente',
      array_to_string(v_missing, ', ');
    RETURN;
  END IF;

  -- CLUSTER :00/:15/:30/:45 — separar em minutos adjacentes
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'anon-insert-rate-purge';
  PERFORM cron.alter_job(job_id := v_jobid, schedule := '1,16,31,46 * * * *');

  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'backfill-queue-reap-stuck';
  PERFORM cron.alter_job(job_id := v_jobid, schedule := '2,17,32,47 * * * *');

  -- CLUSTER :03/:18/:33/:48 — separar em minutos adjacentes
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'connections-health-check';
  PERFORM cron.alter_job(job_id := v_jobid, schedule := '4,19,34,49 * * * *');

  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'reconcile-category-products-count';
  PERFORM cron.alter_job(job_id := v_jobid, schedule := '5,20,35,50 * * * *');

  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'sm-stock-guard';
  PERFORM cron.alter_job(job_id := v_jobid, schedule := '6,21,36,51 * * * *');

  -- Pós-condição
  SELECT ARRAY_AGG(jobname || ' (' || schedule || ')') INTO v_bad
  FROM cron.job
  WHERE
    (jobname = 'anon-insert-rate-purge'              AND schedule <> '1,16,31,46 * * * *') OR
    (jobname = 'backfill-queue-reap-stuck'           AND schedule <> '2,17,32,47 * * * *') OR
    (jobname = 'connections-health-check'            AND schedule <> '4,19,34,49 * * * *') OR
    (jobname = 'reconcile-category-products-count'   AND schedule <> '5,20,35,50 * * * *') OR
    (jobname = 'sm-stock-guard'                      AND schedule <> '6,21,36,51 * * * *');

  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'Pós-condição falhou: schedules incorretos após alter_job: %',
      array_to_string(v_bad, '; ');
  END IF;
END;
$$;
