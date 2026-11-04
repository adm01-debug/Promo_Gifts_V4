DO $$
DECLARE
  v_base text := 'https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1';
  v_sec  text;
BEGIN
  BEGIN
    v_sec := current_setting('app.cron_secret', true);
  EXCEPTION WHEN OTHERS THEN v_sec := NULL; END;

  BEGIN PERFORM cron.unschedule('cleanup-notifications'); EXCEPTION WHEN OTHERS THEN NULL; END;
  IF v_sec IS NOT NULL THEN
    PERFORM cron.schedule('cleanup-notifications', '10 3 * * *', format(
      $s$SELECT net.http_post(url:=%L,headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',%L),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$s$,
      v_base||'/cleanup-notifications', v_sec));
  ELSE
    PERFORM cron.schedule('cleanup-notifications', '10 3 * * *', format(
      $s$SELECT net.http_post(url:=%L,headers:=jsonb_build_object('Content-Type','application/json'),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$s$,
      v_base||'/cleanup-notifications'));
  END IF;

  BEGIN PERFORM cron.unschedule('cleanup-novelties'); EXCEPTION WHEN OTHERS THEN NULL; END;
  IF v_sec IS NOT NULL THEN
    PERFORM cron.schedule('cleanup-novelties', '5 4 * * *', format(
      $s$SELECT net.http_post(url:=%L,headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',%L),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$s$,
      v_base||'/cleanup-novelties', v_sec));
  ELSE
    PERFORM cron.schedule('cleanup-novelties', '5 4 * * *', format(
      $s$SELECT net.http_post(url:=%L,headers:=jsonb_build_object('Content-Type','application/json'),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$s$,
      v_base||'/cleanup-novelties'));
  END IF;

  BEGIN PERFORM cron.unschedule('collections-watcher'); EXCEPTION WHEN OTHERS THEN NULL; END;
  IF v_sec IS NOT NULL THEN
    PERFORM cron.schedule('collections-watcher', '0 6 * * *', format(
      $s$SELECT net.http_post(url:=%L,headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',%L),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$s$,
      v_base||'/collections-watcher', v_sec));
  ELSE
    PERFORM cron.schedule('collections-watcher', '0 6 * * *', format(
      $s$SELECT net.http_post(url:=%L,headers:=jsonb_build_object('Content-Type','application/json'),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$s$,
      v_base||'/collections-watcher'));
  END IF;

  BEGIN PERFORM cron.unschedule('favorites-watcher'); EXCEPTION WHEN OTHERS THEN NULL; END;
  IF v_sec IS NOT NULL THEN
    PERFORM cron.schedule('favorites-watcher', '20 6 * * *', format(
      $s$SELECT net.http_post(url:=%L,headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',%L),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$s$,
      v_base||'/favorites-watcher', v_sec));
  ELSE
    PERFORM cron.schedule('favorites-watcher', '20 6 * * *', format(
      $s$SELECT net.http_post(url:=%L,headers:=jsonb_build_object('Content-Type','application/json'),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$s$,
      v_base||'/favorites-watcher'));
  END IF;

  BEGIN PERFORM cron.unschedule('comparison-price-watcher'); EXCEPTION WHEN OTHERS THEN NULL; END;
  IF v_sec IS NOT NULL THEN
    PERFORM cron.schedule('comparison-price-watcher', '40 6 * * *', format(
      $s$SELECT net.http_post(url:=%L,headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',%L),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$s$,
      v_base||'/comparison-price-watcher', v_sec));
  ELSE
    PERFORM cron.schedule('comparison-price-watcher', '40 6 * * *', format(
      $s$SELECT net.http_post(url:=%L,headers:=jsonb_build_object('Content-Type','application/json'),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$s$,
      v_base||'/comparison-price-watcher'));
  END IF;

  BEGIN PERFORM cron.unschedule('process-queue'); EXCEPTION WHEN OTHERS THEN NULL; END;
  IF v_sec IS NOT NULL THEN
    PERFORM cron.schedule('process-queue', '*/10 * * * *', format(
      $s$SELECT net.http_post(url:=%L,headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',%L),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$s$,
      v_base||'/process-queue', v_sec));
  ELSE
    PERFORM cron.schedule('process-queue', '*/10 * * * *', format(
      $s$SELECT net.http_post(url:=%L,headers:=jsonb_build_object('Content-Type','application/json'),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$s$,
      v_base||'/process-queue'));
  END IF;

  BEGIN PERFORM cron.unschedule('process-scheduled-reports'); EXCEPTION WHEN OTHERS THEN NULL; END;
  IF v_sec IS NOT NULL THEN
    PERFORM cron.schedule('process-scheduled-reports', '5 * * * *', format(
      $s$SELECT net.http_post(url:=%L,headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',%L),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$s$,
      v_base||'/process-scheduled-reports', v_sec));
  ELSE
    PERFORM cron.schedule('process-scheduled-reports', '5 * * * *', format(
      $s$SELECT net.http_post(url:=%L,headers:=jsonb_build_object('Content-Type','application/json'),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$s$,
      v_base||'/process-scheduled-reports'));
  END IF;

  BEGIN PERFORM cron.unschedule('send-scheduled-reports'); EXCEPTION WHEN OTHERS THEN NULL; END;
  IF v_sec IS NOT NULL THEN
    PERFORM cron.schedule('send-scheduled-reports', '10 * * * *', format(
      $s$SELECT net.http_post(url:=%L,headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',%L),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$s$,
      v_base||'/send-scheduled-reports', v_sec));
  ELSE
    PERFORM cron.schedule('send-scheduled-reports', '10 * * * *', format(
      $s$SELECT net.http_post(url:=%L,headers:=jsonb_build_object('Content-Type','application/json'),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$s$,
      v_base||'/send-scheduled-reports'));
  END IF;

  BEGIN PERFORM cron.unschedule('send-digest'); EXCEPTION WHEN OTHERS THEN NULL; END;
  IF v_sec IS NOT NULL THEN
    PERFORM cron.schedule('send-digest', '0 8 * * 1', format(
      $s$SELECT net.http_post(url:=%L,headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',%L),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$s$,
      v_base||'/send-digest', v_sec));
  ELSE
    PERFORM cron.schedule('send-digest', '0 8 * * 1', format(
      $s$SELECT net.http_post(url:=%L,headers:=jsonb_build_object('Content-Type','application/json'),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$s$,
      v_base||'/send-digest'));
  END IF;

  BEGIN PERFORM cron.unschedule('quote-followup-reminders'); EXCEPTION WHEN OTHERS THEN NULL; END;
  IF v_sec IS NOT NULL THEN
    PERFORM cron.schedule('quote-followup-reminders', '0 9 * * *', format(
      $s$SELECT net.http_post(url:=%L,headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',%L),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$s$,
      v_base||'/quote-followup-reminders', v_sec));
  ELSE
    PERFORM cron.schedule('quote-followup-reminders', '0 9 * * *', format(
      $s$SELECT net.http_post(url:=%L,headers:=jsonb_build_object('Content-Type','application/json'),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$s$,
      v_base||'/quote-followup-reminders'));
  END IF;

  BEGIN PERFORM cron.unschedule('connections-health-check'); EXCEPTION WHEN OTHERS THEN NULL; END;
  IF v_sec IS NOT NULL THEN
    PERFORM cron.schedule('connections-health-check', '*/15 * * * *', format(
      $s$SELECT net.http_post(url:=%L,headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',%L),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$s$,
      v_base||'/connections-health-check', v_sec));
  ELSE
    PERFORM cron.schedule('connections-health-check', '*/15 * * * *', format(
      $s$SELECT net.http_post(url:=%L,headers:=jsonb_build_object('Content-Type','application/json'),body:='{"trigger":"cron"}'::jsonb,timeout_milliseconds:=55000)$s$,
      v_base||'/connections-health-check'));
  END IF;

  RAISE NOTICE 'Service cron schedules created. CRON_SECRET present: %', (v_sec IS NOT NULL);
END $$;
