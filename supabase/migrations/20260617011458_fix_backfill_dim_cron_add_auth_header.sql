DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'backfill-image-dimensions') THEN
    PERFORM cron.unschedule('backfill-image-dimensions');
  END IF;
END $$;

SELECT cron.schedule(
  'backfill-image-dimensions',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := public.get_edge_functions_base_url() || '/functions/v1/backfill-image-dimensions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', public.get_edge_function_secret('BACKFILL_DIM_CRON_SECRET')
    ),
    body := '{"trigger":"cron"}'::jsonb,
    timeout_milliseconds := 55000
  ) AS request_id;
  $cron$
);;
