-- Rollback: 20261027120000_fix_connections_auto_test_cron_secret.sql
-- Reverte connections-auto-test para usar 'CRON_SECRET' (estado anterior).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'connections-auto-test'
  ) THEN
    RAISE EXCEPTION 'Rollback falhou: cron.job connections-auto-test não encontrado';
  END IF;
END;
$$;

SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'connections-auto-test'),
  command := $CMD$SELECT net.http_post(url:='https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/connections-auto-test',headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',public.get_edge_function_secret('CRON_SECRET')),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=30000)$CMD$
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'connections-auto-test'
      AND command ILIKE '%CRON_SECRET%'
      AND command NOT ILIKE '%CONNECTIONS_AUTO_TEST_SECRET%'
  ) THEN
    RAISE EXCEPTION 'Pós-rollback falhou: connections-auto-test não usa CRON_SECRET após alter_job';
  END IF;
END;
$$;
