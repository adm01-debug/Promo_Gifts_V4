-- Rollback de 20261114120100_cron005_refresh_all_mvs_diario_timeout_real: volta ao schedule e command observados
-- em produção em 2026-11-14 (cron.job jobid=234, consulta read-only). Resolve o jobid pelo jobname.
DO $$
DECLARE v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'refresh-all-materialized-views';
  IF v_jobid IS NULL THEN RAISE NOTICE 'CRON-005 rollback: job não existe; pulando'; RETURN; END IF;
  PERFORM cron.alter_job(v_jobid,
    schedule => '38 */2 * * *',
    command  => $cmd$SELECT public.fn_cron_safe_run(47::bigint, 'SELECT public.refresh_all_materialized_views();', 55000, 'refresh-all-mvs');$cmd$);
END $$;
