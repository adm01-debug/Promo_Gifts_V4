
-- ===================================================================
-- Cron schema-drift-check: 1×/dia → 4×/dia (a cada 6h)
-- + adicionar bridge fn_sync_local_drift_to_schema_drift_log
-- ===================================================================

-- 1. Atualizar schedule e command do job existente
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname='schema-drift-check'),
  schedule := '11 2,8,14,20 * * *',
  command := $q$
    SELECT public.fn_cron_safe_run(
      25::bigint,
      $$
        SELECT public.fn_check_schema_signature_drift();
        SELECT public.fn_sync_local_drift_to_schema_drift_log();
      $$,
      30000,
      'schema-drift-local-4x'
    );
  $q$
);
;
