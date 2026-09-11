-- Agenda o sweep autônomo de reconciliação CF (idempotente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='cf-recon-dispatch') THEN PERFORM cron.unschedule('cf-recon-dispatch'); END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='cf-recon-collect')  THEN PERFORM cron.unschedule('cf-recon-collect');  END IF;
  PERFORM cron.schedule('cf-recon-dispatch', '* * * * *', 'SELECT public.fn_cf_recon_dispatch(200);');
  PERFORM cron.schedule('cf-recon-collect',  '* * * * *', 'SELECT public.fn_cf_recon_collect();');
END $$;

SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname LIKE 'cf-recon-%' ORDER BY jobname;;
