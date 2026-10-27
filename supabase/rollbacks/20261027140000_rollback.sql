-- Rollback: 20261027140000_stagger_cron_burst_schedules.sql
-- Reverte schedules dos 5 cron jobs para os valores originais pré-migration.

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
    RAISE EXCEPTION 'Rollback falhou: jobs não encontrados: %', array_to_string(missing, ', ');
  END IF;
END;
$$;

SELECT cron.alter_job(
  job_id   := (SELECT jobid FROM cron.job WHERE jobname = 'anon-insert-rate-purge'),
  schedule := '*/15 * * * *'
);

SELECT cron.alter_job(
  job_id   := (SELECT jobid FROM cron.job WHERE jobname = 'backfill-queue-reap-stuck'),
  schedule := '*/15 * * * *'
);

SELECT cron.alter_job(
  job_id   := (SELECT jobid FROM cron.job WHERE jobname = 'connections-health-check'),
  schedule := '3,18,33,48 * * * *'
);

SELECT cron.alter_job(
  job_id   := (SELECT jobid FROM cron.job WHERE jobname = 'reconcile-category-products-count'),
  schedule := '3,18,33,48 * * * *'
);

SELECT cron.alter_job(
  job_id   := (SELECT jobid FROM cron.job WHERE jobname = 'sm-stock-guard'),
  schedule := '3,18,33,48 * * * *'
);

DO $$
DECLARE
  bad_jobs text[];
BEGIN
  SELECT ARRAY_AGG(jobname || ' (' || schedule || ')') INTO bad_jobs
  FROM cron.job
  WHERE
    (jobname = 'anon-insert-rate-purge'            AND schedule <> '*/15 * * * *') OR
    (jobname = 'backfill-queue-reap-stuck'         AND schedule <> '*/15 * * * *') OR
    (jobname = 'connections-health-check'          AND schedule <> '3,18,33,48 * * * *') OR
    (jobname = 'reconcile-category-products-count' AND schedule <> '3,18,33,48 * * * *') OR
    (jobname = 'sm-stock-guard'                    AND schedule <> '3,18,33,48 * * * *');

  IF bad_jobs IS NOT NULL THEN
    RAISE EXCEPTION 'Pós-rollback falhou: schedules incorretos após alter_job: %',
      array_to_string(bad_jobs, '; ');
  END IF;
END;
$$;
