CREATE OR REPLACE FUNCTION public.restore_collection_item_from_trash(_item_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'archive'
AS $function$
DECLARE v_row record;
BEGIN
  SELECT * INTO v_row FROM public.collection_items_trash WHERE id = _item_id AND user_id = auth.uid();
  IF NOT FOUND THEN RETURN false; END IF;

  INSERT INTO archive.collection_items (id, collection_id, product_id, color_name, color_hex, thumbnail_url, notes, price_at_save, sort_order)
  VALUES (
    COALESCE(v_row.original_id, gen_random_uuid()),
    v_row.collection_id,
    v_row.product_id,
    v_row.color_name,
    v_row.color_hex,
    v_row.thumbnail_url,
    v_row.notes,
    v_row.price_at_save,
    v_row.sort_order
  );

  DELETE FROM public.collection_items_trash WHERE id = _item_id;
  RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $function$
