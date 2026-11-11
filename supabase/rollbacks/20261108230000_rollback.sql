-- Restaura cron image-dimensions-backfill no estado inativo original.
SELECT cron.schedule(
  'image-dimensions-backfill',
  '31 */3 * * *',
  $q$SELECT net.http_post(
    url := public.get_edge_functions_base_url() || '/functions/v1/run-script',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', public.get_edge_function_secret('CRON_SECRET')
    ),
    body := '{"script":"image-dimensions-worker"}'::jsonb,
    timeout_milliseconds := 55000
  )$q$
);
UPDATE cron.job SET active = false WHERE jobname = 'image-dimensions-backfill';
