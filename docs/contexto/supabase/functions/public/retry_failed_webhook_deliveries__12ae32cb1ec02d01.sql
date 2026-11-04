CREATE OR REPLACE FUNCTION public.retry_failed_webhook_deliveries()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_supabase_url text;
  v_service_key text;
  v_dispatcher_secret text;
  v_retried int := 0;
  v_skipped int := 0;
  rec record;
  v_max_attempts int;
BEGIN
  v_supabase_url := public.get_edge_functions_base_url();

  BEGIN
    v_service_key := current_setting('app.supabase_service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    v_service_key := NULL;
  END;

  BEGIN
    v_dispatcher_secret := public.get_edge_function_secret('WEBHOOK_DISPATCHER_SECRET');
  EXCEPTION WHEN OTHERS THEN
    v_dispatcher_secret := NULL;
  END;

  IF v_dispatcher_secret IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'WEBHOOK_DISPATCHER_SECRET not configured in vault');
  END IF;

  FOR rec IN
    WITH latest AS (
      SELECT DISTINCT ON (d.webhook_id, d.event, d.payload_hash)
        d.id, d.webhook_id, d.event, d.payload, d.attempt, d.success
      FROM public.webhook_deliveries d
      WHERE d.delivered_at > now() - interval '1 hour'
      ORDER BY d.webhook_id, d.event, d.payload_hash, d.attempt DESC
    )
    SELECT l.*, w.active, w.retry_policy
    FROM latest l
    JOIN public.outbound_webhooks w ON w.id = l.webhook_id
    WHERE l.success = false AND w.active = true
  LOOP
    v_max_attempts := COALESCE((rec.retry_policy->>'max_attempts')::int, 3);

    IF rec.attempt >= v_max_attempts THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/webhook-dispatcher',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-dispatcher-secret', v_dispatcher_secret,
        'Authorization', COALESCE('Bearer ' || v_service_key, '')
      ),
      body := jsonb_build_object('event', rec.event, 'payload', rec.payload)
    );
    v_retried := v_retried + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'retried', v_retried, 'skipped_max_attempts', v_skipped, 'ran_at', now());
END;
$function$
