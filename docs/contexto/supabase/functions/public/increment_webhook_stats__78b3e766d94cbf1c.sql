CREATE OR REPLACE FUNCTION public.increment_webhook_stats(p_endpoint_id uuid, p_is_invalid boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.inbound_webhook_endpoints
  SET
    last_received_at = NOW(),
    total_received   = COALESCE(total_received, 0) + 1,
    total_invalid    = COALESCE(total_invalid,  0) + CASE WHEN p_is_invalid THEN 1 ELSE 0 END
  WHERE id = p_endpoint_id;
END;
$function$
