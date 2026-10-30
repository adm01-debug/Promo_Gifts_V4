-- Migration: 20261027120000_fix_connections_auto_test_cron_secret.sql
-- BUG: connections-auto-test cron envia get_edge_function_secret('CRON_SECRET')
-- mas a função verifica 'CONNECTIONS_AUTO_TEST_SECRET' via authorizeCron.
-- Resultado: 401 {"error":"unauthorized"} a cada 15 minutos desde implantação.
-- Evidência: net._http_response mostra 401 nos horários 09,24,39,54 de cada hora.
-- Vault confirma: CONNECTIONS_AUTO_TEST_SECRET existe (SELECT name FROM vault.secrets WHERE name='CONNECTIONS_AUTO_TEST_SECRET').
-- Rollback: substituir 'CONNECTIONS_AUTO_TEST_SECRET' por 'CRON_SECRET' no comando abaixo.
-- REPLAY-SAFE: pré/pós condições usam RAISE NOTICE + RETURN quando o job não
-- existe (ambiente de replay do drift-check não tem cron.job).

DO $$
BEGIN
  IF to_regclass('cron.job') IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM cron.job WHERE jobname = 'connections-auto-test'
     ) THEN
    RAISE NOTICE 'Pré-condição: cron.job connections-auto-test não encontrado — skip (ambiente de replay ou job ainda não criado)';
    RETURN;
  END IF;

  PERFORM cron.alter_job(
    job_id := (SELECT jobid FROM cron.job WHERE jobname = 'connections-auto-test'),
    command := $CMD$SELECT net.http_post(url:='https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/connections-auto-test',headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',public.get_edge_function_secret('CONNECTIONS_AUTO_TEST_SECRET')),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=30000)$CMD$
  );

  IF NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'connections-auto-test'
      AND command ILIKE '%CONNECTIONS_AUTO_TEST_SECRET%'
  ) THEN
    RAISE EXCEPTION 'Pós-condição falhou: connections-auto-test não usa CONNECTIONS_AUTO_TEST_SECRET após alter_job';
  END IF;
END;
$$;

