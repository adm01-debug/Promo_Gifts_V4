CREATE OR REPLACE FUNCTION public.cleanup_stale_webhook_locks()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_del INTEGER;
BEGIN
  DELETE FROM public.webhook_delivery_locks WHERE claimed_at < NOW()-INTERVAL '2 hours';
  GET DIAGNOSTICS v_del = ROW_COUNT;
  RETURN v_del;
END; $function$
