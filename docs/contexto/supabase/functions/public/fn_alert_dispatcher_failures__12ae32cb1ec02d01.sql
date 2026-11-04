CREATE OR REPLACE FUNCTION public.fn_alert_dispatcher_failures()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- fix_version=2026-07-10-dispatcher-alert-v1 ANTI-REGRESSÃO
DECLARE
  v_failed  int;
  v_timeout int;
  v_pending int;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE delivery_status='failed'),
    COUNT(*) FILTER (WHERE delivery_status='timeout'),
    COUNT(*) FILTER (WHERE delivery_status='pending' AND fired_at < NOW()-INTERVAL '5 minutes')
  INTO v_failed, v_timeout, v_pending
  FROM public.webhook_dispatcher_log
  WHERE fired_at > NOW() - INTERVAL '1 hour';

  IF v_failed > 0 THEN
    RAISE WARNING 'ALERT[dispatcher_failures]: % deliveries FAILED na última hora', v_failed;
  END IF;
  IF v_timeout > 0 THEN
    RAISE WARNING 'ALERT[dispatcher_timeouts]: % deliveries TIMEOUT na última hora', v_timeout;
  END IF;
  IF v_pending > 0 THEN
    RAISE WARNING 'ALERT[dispatcher_stuck]: % deliveries PENDING há mais de 5min', v_pending;
  END IF;
END;
$function$
