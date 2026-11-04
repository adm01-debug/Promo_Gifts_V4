CREATE OR REPLACE FUNCTION public.fn_quote_items_calc_subtotal()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  NEW.subtotal := COALESCE(NEW.quantity, 0) * COALESCE(NEW.unit_price, 0)
                + COALESCE(NEW.personalization_cost, 0)
                - COALESCE(NEW.discount_amount, 0);
  RETURN NEW;
END $function$
