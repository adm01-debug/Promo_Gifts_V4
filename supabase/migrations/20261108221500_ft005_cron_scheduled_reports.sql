-- Rollback: 20261108221500_rollback.sql
-- Versiona os pg_cron jobs de relatórios agendados (FT-005)
-- Idempotente: unschedule + schedule garante estado determinístico

SELECT cron.unschedule('process-scheduled-reports')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-reports');

SELECT cron.schedule(
  'process-scheduled-reports',
  '5 * * * *',
  $$SELECT net.http_post(
    url:='https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/process-scheduled-reports',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'x-cron-secret', public.get_edge_function_secret('CRON_SECRET')
    ),
    body:='{"trigger":"cron"}'::jsonb,
    timeout_milliseconds:=55000
  )$$
);

SELECT cron.unschedule('send-scheduled-reports')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-scheduled-reports');

SELECT cron.schedule(
  'send-scheduled-reports',
  '10 * * * *',
  $$SELECT net.http_post(
    url:='https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/send-scheduled-reports',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'x-cron-secret', public.get_edge_function_secret('CRON_SECRET')
    ),
    body:='{"trigger":"cron"}'::jsonb,
    timeout_milliseconds:=55000
  )$$
);
