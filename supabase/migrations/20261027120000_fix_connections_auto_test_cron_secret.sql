-- Migration: 20261027120000_fix_connections_auto_test_cron_secret.sql
-- BUG: connections-auto-test cron envia get_edge_function_secret('CRON_SECRET')
-- mas a funcao verifica 'CONNECTIONS_AUTO_TEST_SECRET' via authorizeCron.
-- Resultado: 401 {"error":"unauthorized"} a cada 15 minutos desde implantacao.
-- Evidencia: net._http_response mostra 401 nos horarios 09,24,39,54 de cada hora.
-- Vault confirma: CONNECTIONS_AUTO_TEST_SECRET existe (SELECT name FROM vault.secrets WHERE name='CONNECTIONS_AUTO_TEST_SECRET').
-- Rollback: substituir 'CONNECTIONS_AUTO_TEST_SECRET' por 'CRON_SECRET' no comando abaixo.

DO $$
DECLARE
  v_job_id bigint;
BEGIN
  -- Se pg_cron nao esta instalado (ex: container de replay do drift-check), ignorar silenciosamente.
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE '[20261027120000] pg_cron nao instalado -- migration idempotente ignorada';
    RETURN;
  END IF;

  -- Pre-condicao: o job deve existir em producao.
  -- Em ambientes sem o job (replay, staging), ignorar silenciosamente.
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'connections-auto-test') THEN
    RAISE NOTICE '[20261027120000] cron.job connections-auto-test nao encontrado -- migration idempotente ignorada';
    RETURN;
  END IF;

  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'connections-auto-test';

  PERFORM cron.alter_job(
    job_id := v_job_id,
    command := $CMD$SELECT net.http_post(url:='https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/connections-auto-test',headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',public.get_edge_function_secret('CONNECTIONS_AUTO_TEST_SECRET')),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=30000)$CMD$
  );

  -- Pos-condicao
  IF NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'connections-auto-test'
      AND command ILIKE '%CONNECTIONS_AUTO_TEST_SECRET%'
  ) THEN
    RAISE EXCEPTION '[20261027120000] Pos-condicao falhou: connections-auto-test nao usa CONNECTIONS_AUTO_TEST_SECRET apos alter_job';
  END IF;
END;
$$;
