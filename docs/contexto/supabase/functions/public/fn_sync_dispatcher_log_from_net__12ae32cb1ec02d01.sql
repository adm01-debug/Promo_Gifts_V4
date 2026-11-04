CREATE OR REPLACE FUNCTION public.fn_sync_dispatcher_log_from_net()
 RETURNS TABLE(synced_count integer, failed_count integer, timeout_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'extensions'
AS $function$
-- fix_version=2026-07-10-dispatcher-log-sync-v2 ANTI-REGRESSÃO
-- Lê net._http_response e atualiza webhook_dispatcher_log com o status HTTP real.
DECLARE
  v_synced  int := 0;
  v_failed  int := 0;
  v_timeout int := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT
      wdl.id                                               AS log_id,
      regexp_replace(wdl.response_body, '.*pg_net_request_id=(\d+).*', '\1')::bigint AS req_id,
      hr.status_code,
      LEFT(hr.content, 500)                               AS resp_content,
      hr.timed_out,
      hr.error_msg
    FROM public.webhook_dispatcher_log wdl
    JOIN net._http_response hr
      ON hr.id = regexp_replace(wdl.response_body, '.*pg_net_request_id=(\d+).*', '\1')::bigint
    WHERE wdl.http_status IS NULL
      AND wdl.response_body LIKE '%pg_net_request_id=%'
      AND wdl.fired_at > NOW() - INTERVAL '7 days'
  LOOP
    IF rec.timed_out THEN
      UPDATE public.webhook_dispatcher_log
      SET http_status     = 408,
          delivery_status = 'timeout',
          response_body   = 'TIMEOUT: ' || COALESCE(rec.error_msg, 'timed out'),
          responded_at    = NOW()
      WHERE id = rec.log_id;
      v_timeout := v_timeout + 1;

    ELSIF rec.status_code BETWEEN 200 AND 299 THEN
      UPDATE public.webhook_dispatcher_log
      SET http_status     = rec.status_code,
          delivery_status = 'delivered',
          response_body   = rec.resp_content
      WHERE id = rec.log_id;
      v_synced := v_synced + 1;

    ELSE
      UPDATE public.webhook_dispatcher_log
      SET http_status     = rec.status_code,
          delivery_status = 'failed',
          response_body   = rec.resp_content,
          error_message   = 'HTTP ' || rec.status_code || ': ' || LEFT(rec.resp_content, 200)
      WHERE id = rec.log_id;
      v_failed := v_failed + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_synced, v_failed, v_timeout;
END;
$function$
