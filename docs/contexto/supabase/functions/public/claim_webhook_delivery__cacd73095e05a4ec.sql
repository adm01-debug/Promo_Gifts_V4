CREATE OR REPLACE FUNCTION public.claim_webhook_delivery(p_webhook_id uuid, p_payload_hash text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_payload_hash IS NULL THEN RETURN TRUE; END IF;
  IF EXISTS (SELECT 1 FROM public.webhook_deliveries WHERE webhook_id=p_webhook_id AND payload_hash=p_payload_hash AND success=TRUE LIMIT 1) THEN
    RETURN FALSE;
  END IF;
  INSERT INTO public.webhook_delivery_locks(webhook_id, payload_hash)
  VALUES(p_webhook_id, p_payload_hash)
  ON CONFLICT (webhook_id, payload_hash) DO NOTHING;
  RETURN FOUND;
END; $function$
