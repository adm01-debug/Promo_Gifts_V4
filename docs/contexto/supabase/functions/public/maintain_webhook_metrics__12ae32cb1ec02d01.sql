CREATE OR REPLACE FUNCTION public.maintain_webhook_metrics()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Cleanup: remove metrics > 90 dias (sem lógica de partição, pois não é partitioned em PROD)
  DELETE FROM public.webhook_delivery_metrics WHERE occurred_at < now() - INTERVAL '90 days';
END;
$function$
