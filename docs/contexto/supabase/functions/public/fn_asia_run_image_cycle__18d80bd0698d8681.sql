CREATE OR REPLACE FUNCTION public.fn_asia_run_image_cycle(p_limit integer DEFAULT 20, p_wait_seconds integer DEFAULT 60)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
DECLARE
  v_lock    boolean;
  v_dispatch jsonb;
  v_harvest  jsonb;
  v_stale    jsonb;
BEGIN
  v_lock := pg_try_advisory_lock(74108913);
  IF NOT v_lock THEN
    RETURN jsonb_build_object(
      'status', 'skipped_already_running',
      'pending_queue', (SELECT COUNT(*) FROM asia_image_import_queue WHERE status = 'pending')
    );
  END IF;

  BEGIN
    v_stale   := fn_asia_recover_stale_queue();
    PERFORM fn_asia_harvest_queue_batch();

    IF (SELECT COUNT(*) FROM asia_image_import_queue WHERE status = 'pending') = 0 THEN
      PERFORM pg_advisory_unlock(74108913);
      RETURN jsonb_build_object('status', 'no_pending', 'stale', v_stale);
    END IF;

    v_dispatch := fn_asia_dispatch_queue_batch(p_limit);

    IF (v_dispatch->>'dispatched')::int = 0 THEN
      PERFORM pg_advisory_unlock(74108913);
      RETURN jsonb_build_object('status', 'dispatch_empty', 'stale', v_stale);
    END IF;

    PERFORM pg_sleep(p_wait_seconds);
    v_harvest := fn_asia_harvest_queue_batch();

    PERFORM pg_advisory_unlock(74108913);

    RETURN jsonb_build_object(
      'status',        'ok',
      'dispatched',    v_dispatch->>'dispatched',
      'harvest',       v_harvest,
      'stale',         v_stale,
      'pending_queue', (SELECT COUNT(*) FROM asia_image_import_queue WHERE status = 'pending')
    );
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_advisory_unlock(74108913);
    RAISE;
  END;
END;
$function$
