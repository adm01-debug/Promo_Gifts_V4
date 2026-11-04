CREATE OR REPLACE FUNCTION public.restore_favorite_item_from_trash(_item_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_row record;
BEGIN
  SELECT * INTO v_row FROM public.favorite_items_trash WHERE id = _item_id AND user_id = auth.uid();
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.favorite_items (id, list_id, user_id, product_id, variant_id, variant_info, note, price_at_save)
  VALUES (v_row.id, v_row.list_id, v_row.user_id, v_row.product_id, v_row.variant_id, v_row.variant_info, v_row.note, v_row.price_at_save);
  DELETE FROM public.favorite_items_trash WHERE id = _item_id;
  RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $function$
