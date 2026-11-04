CREATE OR REPLACE FUNCTION public.sync_order_payment_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  new_status public.payment_status;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    new_status := NEW.status;
  ELSE
    RETURN NULL;
  END IF;

  UPDATE public.orders o
  SET payment_status = new_status,
      updated_at = now()
  WHERE o.id = NEW.order_id;

  RETURN NEW;
END;
$function$
