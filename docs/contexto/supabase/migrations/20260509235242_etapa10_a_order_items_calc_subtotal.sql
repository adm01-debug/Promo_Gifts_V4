-- Trigger simétrico a fn_quote_items_calc_subtotal
CREATE OR REPLACE FUNCTION public.fn_order_items_calc_subtotal()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.subtotal := COALESCE(NEW.quantity, 0) * COALESCE(NEW.unit_price, 0)
                + COALESCE(NEW.personalization_cost, 0)
                - COALESCE(NEW.discount_amount, 0);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_order_items_calc_subtotal
  BEFORE INSERT OR UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_order_items_calc_subtotal();

COMMENT ON FUNCTION public.fn_order_items_calc_subtotal IS
  'Calcula subtotal = qty*unit_price + personalization_cost - discount_amount. Simétrico a fn_quote_items_calc_subtotal. Drift assimetria E9 → resolvido E10.';

COMMENT ON TRIGGER trg_order_items_calc_subtotal ON public.order_items IS
  'Calcula subtotal automaticamente. Roda BEFORE order_items_recalc_total (AFTER) que então propaga para orders.total_amount.';
