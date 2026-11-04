CREATE OR REPLACE FUNCTION public.recalc_order_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_order_id uuid;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);

  UPDATE public.orders o
  SET subtotal = COALESCE((
        SELECT SUM(ROUND(oi.quantity * (oi.unit_price - COALESCE(oi.discount_amount,0) + COALESCE(oi.personalization_cost,0)),2))
        FROM public.order_items oi
        WHERE oi.order_id = v_order_id
      ),0),
      total = ROUND(
        COALESCE((
          SELECT SUM(ROUND(oi.quantity * (oi.unit_price - COALESCE(oi.discount_amount,0) + COALESCE(oi.personalization_cost,0)),2))
          FROM public.order_items oi
          WHERE oi.order_id = v_order_id
        ),0)
        - COALESCE(o.discount_amount,0)
        + COALESCE(o.shipping_cost,0)
        + COALESCE(o.tax_amount,0)
      ,2),
      updated_at = now()
  WHERE o.id = v_order_id;

  RETURN COALESCE(NEW, OLD);
END$function$
