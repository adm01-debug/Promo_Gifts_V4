-- Rollback: supabase/rollbacks/20261108030000_rollback.sql
-- FT-005: Versionar cron jobs process-scheduled-reports e send-scheduled-reports
-- Objetos JÁ EXISTEM em produção (cron.job jobid 15 e 16, confirmado via execute_sql 2026-11-08).
-- Aplicação idempotente: unschedule + schedule. Risco zero — não altera estrutura.

DO $$
BEGIN
  PERFORM cron.unschedule('process-scheduled-reports');
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

DO $$
BEGIN
  PERFORM cron.unschedule('send-scheduled-reports');
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

SELECT cron.schedule(
  'process-scheduled-reports',
  '5 * * * *',
  $cmd$SELECT net.http_post(
    url:='https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/process-scheduled-reports',
    headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',public.get_edge_function_secret('CRON_SECRET')),
    body:='{"trigger":"cron"}'::jsonb,
    timeout_milliseconds:=55000
  )$cmd$
);

SELECT cron.schedule(
  'send-scheduled-reports',
  '10 * * * *',
  $cmd$SELECT net.http_post(
    url:='https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/send-scheduled-reports',
    headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',public.get_edge_function_secret('CRON_SECRET')),
    body:='{"trigger":"cron"}'::jsonb,
    timeout_milliseconds:=55000
  )$cmd$
);
