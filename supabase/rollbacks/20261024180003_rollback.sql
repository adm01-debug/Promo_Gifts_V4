-- Rollback da migration 20261024180003_cron_schedule_p19_remaining.sql
-- Restaura auto-block-offenders para schedule a cada 5 min (pré-FASE B).

DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'auto-block-offenders';
  IF v_jobid IS NULL THEN
    RAISE EXCEPTION 'Rollback falhou: job auto-block-offenders não encontrado';
  END IF;
  PERFORM cron.alter_job(
    job_id   := v_jobid,
    schedule := '1,6,11,16,21,26,31,36,41,46,51,56 * * * *'
  );
END;
$$;
