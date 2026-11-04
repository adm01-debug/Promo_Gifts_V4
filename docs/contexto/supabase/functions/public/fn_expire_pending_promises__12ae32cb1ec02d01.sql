CREATE OR REPLACE FUNCTION public.fn_expire_pending_promises()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_expired integer;
BEGIN
  UPDATE public.supplier_replenishment_events
  SET resolution = 'expired', resolved_at = now(), updated_at = now()
  WHERE resolution = 'pending' AND promised_date < (current_date - 15);
  GET DIAGNOSTICS v_expired = ROW_COUNT;
  RETURN v_expired;
END;
$function$
