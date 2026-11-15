-- Rollback 20261111222500: volta touch_seller_cart_on_item_change para SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.touch_seller_cart_on_item_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.seller_carts SET updated_at = now() WHERE id = OLD.cart_id;
    RETURN OLD;
  END IF;
  UPDATE public.seller_carts SET updated_at = now() WHERE id = NEW.cart_id;
  IF TG_OP = 'UPDATE' AND NEW.cart_id <> OLD.cart_id THEN
    UPDATE public.seller_carts SET updated_at = now() WHERE id = OLD.cart_id;
  END IF;
  RETURN NEW;
END;
$$;
