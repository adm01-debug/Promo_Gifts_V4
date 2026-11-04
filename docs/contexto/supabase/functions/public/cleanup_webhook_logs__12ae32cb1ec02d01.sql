CREATE OR REPLACE FUNCTION public.cleanup_webhook_logs()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted_outbound int;
  v_deleted_inbound int;
  v_deleted_metrics int;
BEGIN
  WITH del AS (
    DELETE FROM public.webhook_deliveries
    WHERE delivered_at < now() - interval '90 days'
    RETURNING 1
  ) SELECT count(*) INTO v_deleted_outbound FROM del;

  WITH del AS (
    DELETE FROM public.inbound_webhook_events
    WHERE received_at < now() - interval '90 days'
    RETURNING 1
  ) SELECT count(*) INTO v_deleted_inbound FROM del;

  WITH del AS (
    DELETE FROM public.webhook_delivery_metrics
    WHERE occurred_at < now() - interval '90 days'
    RETURNING 1
  ) SELECT count(*) INTO v_deleted_metrics FROM del;

  RETURN jsonb_build_object(
    'ok', true,
    'deleted_outbound', v_deleted_outbound,
    'deleted_inbound', v_deleted_inbound,
    'deleted_metrics', v_deleted_metrics,
    'ran_at', now()
  );
END;
$function$
