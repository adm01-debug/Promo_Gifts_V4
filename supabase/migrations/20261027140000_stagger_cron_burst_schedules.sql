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

-- ── PRÉ-CONDIÇÕES ──────────────────────────────────────────────────────────────

DO $$
DECLARE
  missing text[];
BEGIN
  SELECT ARRAY_AGG(n) INTO missing
  FROM UNNEST(ARRAY[
    'anon-insert-rate-purge',
    'backfill-queue-reap-stuck',
    'connections-health-check',
    'reconcile-category-products-count',
    'sm-stock-guard'
  ]) n
  WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = n);

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Pré-condição falhou: jobs não encontrados: %', array_to_string(missing, ', ');
  END IF;
END;
$$;

-- ── CLUSTER :00/:15/:30/:45 — separar em minutos adjacentes ──────────────────
-- sync-is-stockout-universal fica em :00/:15/:30/:45 (âncora, não alterado)
-- anon-insert-rate-purge:    */15  → 1,16,31,46  (+1 min)
-- backfill-queue-reap-stuck: */15  → 2,17,32,47  (+2 min)

SELECT cron.alter_job(
  job_id   := (SELECT jobid FROM cron.job WHERE jobname = 'anon-insert-rate-purge'),
  schedule := '1,16,31,46 * * * *'
);

SELECT cron.alter_job(
  job_id   := (SELECT jobid FROM cron.job WHERE jobname = 'backfill-queue-reap-stuck'),
  schedule := '2,17,32,47 * * * *'
);

-- ── CLUSTER :03/:18/:33/:48 — separar em minutos adjacentes ─────────────────
-- cleanup-stale-ai-pending-logs fica em :03/:18/:33/:48 (âncora, não alterado)
-- connections-health-check:        3,18,33,48  → 4,19,34,49  (+1 min)
-- reconcile-category-products-count: 3,18,33,48 → 5,20,35,50 (+2 min)
-- sm-stock-guard:                  3,18,33,48  → 6,21,36,51  (+3 min)

SELECT cron.alter_job(
  job_id   := (SELECT jobid FROM cron.job WHERE jobname = 'connections-health-check'),
  schedule := '4,19,34,49 * * * *'
);

SELECT cron.alter_job(
  job_id   := (SELECT jobid FROM cron.job WHERE jobname = 'reconcile-category-products-count'),
  schedule := '5,20,35,50 * * * *'
);

SELECT cron.alter_job(
  job_id   := (SELECT jobid FROM cron.job WHERE jobname = 'sm-stock-guard'),
  schedule := '6,21,36,51 * * * *'
);

-- ── PÓS-CONDIÇÕES ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  bad_jobs text[];
BEGIN
  SELECT ARRAY_AGG(jobname || ' (' || schedule || ')') INTO bad_jobs
  FROM cron.job
  WHERE
    (jobname = 'anon-insert-rate-purge'              AND schedule <> '1,16,31,46 * * * *') OR
    (jobname = 'backfill-queue-reap-stuck'           AND schedule <> '2,17,32,47 * * * *') OR
    (jobname = 'connections-health-check'            AND schedule <> '4,19,34,49 * * * *') OR
    (jobname = 'reconcile-category-products-count'   AND schedule <> '5,20,35,50 * * * *') OR
    (jobname = 'sm-stock-guard'                      AND schedule <> '6,21,36,51 * * * *');

  IF bad_jobs IS NOT NULL THEN
    RAISE EXCEPTION 'Pós-condição falhou: schedules incorretos após alter_job: %',
      array_to_string(bad_jobs, '; ');
  END IF;
END;
$$;
