CREATE OR REPLACE FUNCTION public.restore_favorite_from_trash(_trash_id uuid, _user_id uuid, _fallback_list_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_trash           public.favorite_items_trash%ROWTYPE;
  v_list_id         uuid;
  v_item_id         uuid;
  v_original_list   uuid;
BEGIN
  SELECT * INTO v_trash
  FROM public.favorite_items_trash
  WHERE id = _trash_id AND user_id = _user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not-found');
  END IF;

  v_original_list := v_trash.list_id;

  SELECT id INTO v_list_id
  FROM public.favorite_lists
  WHERE id = v_trash.list_id
    AND user_id = _user_id
    AND is_archived = false;

  IF v_list_id IS NULL AND _fallback_list_id IS NOT NULL THEN
    SELECT id INTO v_list_id
    FROM public.favorite_lists
    WHERE id = _fallback_list_id
      AND user_id = _user_id
      AND is_archived = false;
  END IF;

  IF v_list_id IS NULL THEN
    v_list_id := public.ensure_default_favorite_list(_user_id);
  END IF;

  INSERT INTO public.favorite_items (
    list_id, user_id, product_id, variant_id, variant_info,
    note, price_at_save
  ) VALUES (
    v_list_id, _user_id, v_trash.product_id, v_trash.variant_id, v_trash.variant_info,
    v_trash.note, v_trash.price_at_save
  )
  ON CONFLICT (list_id, product_id, variant_id) DO NOTHING
  RETURNING id INTO v_item_id;

  DELETE FROM public.favorite_items_trash WHERE id = _trash_id;

  RETURN jsonb_build_object(
    'ok', true,
    'item_id', v_item_id,
    'list_id', v_list_id,
    'original_list_changed', (v_list_id IS DISTINCT FROM v_original_list)
  );
END;
$function$
