-- Fix cron job pointing to wrong Supabase project URL
-- Previous cron used project ref 'nmojwpihnslkssljowjh' (dev/staging)
-- instead of 'doufsxqlfjyuvxuezpln' (production).

DO $$
DECLARE
  v_project_url  text := 'https://doufsxqlfjyuvxuezpln.supabase.co';
  v_cron_secret  text;
BEGIN
  BEGIN
    v_cron_secret := current_setting('app.cron_secret', true);
  EXCEPTION WHEN OTHERS THEN
    v_cron_secret := NULL;
  END;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'connections-auto-test') THEN
    PERFORM cron.unschedule('connections-auto-test');
  END IF;

  IF v_cron_secret IS NOT NULL AND v_cron_secret != '' THEN
    PERFORM cron.schedule(
      'connections-auto-test',
      '*/15 * * * *',
      format(
        $sql$
        SELECT net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-secret', %L
          ),
          body := '{"trigger":"cron"}'::jsonb,
          timeout_milliseconds := 30000
        ) AS request_id;
        $sql$,
        v_project_url || '/functions/v1/connections-auto-test',
        v_cron_secret
      )
    );
    RAISE NOTICE 'connections-auto-test cron rescheduled with CRON_SECRET at correct project URL';
  ELSE
    PERFORM cron.schedule(
      'connections-auto-test',
      '*/15 * * * *',
      format(
        $sql$
        SELECT net.http_post(
          url := %L,
          headers := jsonb_build_object('Content-Type', 'application/json'),
          body := '{"trigger":"cron"}'::jsonb,
          timeout_milliseconds := 30000
        ) AS request_id;
        $sql$,
        v_project_url || '/functions/v1/connections-auto-test'
      )
    );
    RAISE WARNING 'connections-auto-test cron rescheduled at correct URL but CRON_SECRET not set';
  END IF;

END $$;
