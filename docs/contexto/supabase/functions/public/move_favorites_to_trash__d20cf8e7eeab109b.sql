CREATE OR REPLACE FUNCTION public.move_favorites_to_trash(_item_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_count int;
BEGIN
  WITH deleted AS (
    DELETE FROM public.favorite_items
    WHERE id = ANY(_item_ids) AND user_id = auth.uid()
    RETURNING *
  ),
  inserted AS (
    INSERT INTO public.favorite_items_trash (id, list_id, user_id, product_id, variant_id, variant_info, note, price_at_save)
    SELECT id, list_id, user_id, product_id, variant_id, variant_info, note, price_at_save FROM deleted
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM inserted;
  RETURN v_count;
EXCEPTION WHEN OTHERS THEN RETURN 0;
END $function$
