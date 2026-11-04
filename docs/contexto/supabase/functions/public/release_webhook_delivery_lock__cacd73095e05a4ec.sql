CREATE OR REPLACE FUNCTION public.release_webhook_delivery_lock(p_webhook_id uuid, p_payload_hash text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_payload_hash IS NULL THEN RETURN; END IF;
  DELETE FROM public.webhook_delivery_locks WHERE webhook_id=p_webhook_id AND payload_hash=p_payload_hash;
END; $function$
