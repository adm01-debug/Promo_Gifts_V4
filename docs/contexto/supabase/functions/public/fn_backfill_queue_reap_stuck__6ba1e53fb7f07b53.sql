CREATE OR REPLACE FUNCTION public.fn_backfill_queue_reap_stuck(p_stuck_minutes integer DEFAULT 30, p_max_attempts integer DEFAULT 5)
 RETURNS TABLE(reaped_to_pending integer, reaped_to_failed integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_to_pending integer := 0;
  v_to_failed integer := 0;
BEGIN
  WITH stuck AS (
    SELECT id, attempts
    FROM image_backfill_queue
    WHERE status = 'processing'
      AND started_at IS NOT NULL
      AND started_at < now() - (p_stuck_minutes || ' minutes')::interval
    FOR UPDATE SKIP LOCKED
  ),
  updated AS (
    UPDATE image_backfill_queue q
    SET attempts = stuck.attempts + 1,
        status = CASE WHEN stuck.attempts + 1 >= p_max_attempts THEN 'failed' ELSE 'pending' END,
        last_error = CASE WHEN stuck.attempts + 1 >= p_max_attempts
                      THEN COALESCE(q.last_error || ' | ', '') || 'reaper: desistiu após ' || (stuck.attempts + 1) || ' tentativas (travado em processing por > ' || p_stuck_minutes || ' min)'
                      ELSE COALESCE(q.last_error || ' | ', '') || 'reaper: reenfileirado (tentativa ' || (stuck.attempts + 1) || '), estava travado em processing'
                    END,
        worker_id = NULL,
        started_at = NULL
    FROM stuck
    WHERE q.id = stuck.id
    RETURNING q.status
  )
  SELECT count(*) FILTER (WHERE status = 'pending'), count(*) FILTER (WHERE status = 'failed')
  INTO v_to_pending, v_to_failed
  FROM updated;

  RETURN QUERY SELECT v_to_pending, v_to_failed;
END;
$function$
