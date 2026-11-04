CREATE OR REPLACE FUNCTION public.fn_asia_legacy_run_cycle(p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'archive'
AS $function$
DECLARE
  v_lock     BOOLEAN;
  v_dispatch JSONB;
  v_harvest  JSONB;
  v_pending  INT; v_uploading INT; v_done INT; v_error INT;
BEGIN
  v_lock := pg_try_advisory_xact_lock(hashtext('fn_asia_legacy_run_cycle')::BIGINT);
  IF NOT v_lock THEN RETURN jsonb_build_object('status', 'skipped_lock'); END IF;

  v_harvest  := fn_asia_legacy_harvest_batch();
  v_dispatch := fn_asia_legacy_dispatch_batch(p_limit);

  SELECT COUNT(*) FILTER (WHERE status='pending')   INTO v_pending   FROM asia_legacy_upload_queue;
  SELECT COUNT(*) FILTER (WHERE status='uploading') INTO v_uploading FROM asia_legacy_upload_queue;
  SELECT COUNT(*) FILTER (WHERE status='done')      INTO v_done      FROM asia_legacy_upload_queue;
  SELECT COUNT(*) FILTER (WHERE status='error')     INTO v_error     FROM asia_legacy_upload_queue;

  RETURN jsonb_build_object(
    'status', 'ok',
    'dispatch', v_dispatch, 'harvest', v_harvest,
    'pending', v_pending, 'uploading', v_uploading,
    'done', v_done, 'error', v_error
  );
END;
$function$
