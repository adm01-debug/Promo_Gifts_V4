-- Rollback de 20260917090000_e47_fix_schema_drift_cron_split.sql
-- Restaura o jobid=245 (schema-drift-check) ao command original com
-- 1 chamada de fn_cron_safe_run contendo os 2 statements internos.
-- Reintroduz o risco de savepoint acoplado descrito na migration E47.

SELECT cron.alter_job(245, command := $cmd$
    SELECT public.fn_cron_safe_run(
      25::bigint,
      $$
        SELECT public.fn_check_schema_signature_drift();
        SELECT public.fn_sync_local_drift_to_schema_drift_log();
      $$,
      30000,
      'schema-drift-local-4x'
    );
  $cmd$
);
