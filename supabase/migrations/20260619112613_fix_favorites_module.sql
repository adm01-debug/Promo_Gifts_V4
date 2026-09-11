
-- BUG #1: fix unique index (COALESCE expression breaks PostgREST upsert → 42P10)
DROP INDEX IF EXISTS public.uniq_fi_list_product_variant;

CREATE UNIQUE INDEX uniq_fi_list_product_variant
  ON public.favorite_items USING btree (list_id, product_id, variant_id)
  NULLS NOT DISTINCT;

-- BUG #2: race-safe ensure_default_favorite_list
CREATE OR REPLACE FUNCTION public.ensure_default_favorite_list(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_list_id uuid;
BEGIN
  SELECT id INTO v_list_id
  FROM public.favorite_lists
  WHERE user_id = _user_id AND is_default = true
  LIMIT 1;

  IF v_list_id IS NOT NULL THEN
    RETURN v_list_id;
  END IF;

  BEGIN
    INSERT INTO public.favorite_lists (
      user_id, name, description, color, icon, is_default, position
    ) VALUES (
      _user_id, 'Meus Favoritos', 'Lista padrão de favoritos', '#3B82F6', 'Heart', true, 0
    )
    RETURNING id INTO v_list_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT id INTO v_list_id
    FROM public.favorite_lists
    WHERE user_id = _user_id AND is_default = true
    LIMIT 1;
  END;

  RETURN v_list_id;
END;
$$;

-- BUG #3: soft-delete trigger SECURITY DEFINER (coordinators deleting other users' items)
CREATE OR REPLACE FUNCTION public.fn_favorite_items_soft_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.favorite_items_trash (
    original_id, list_id, user_id, product_id, variant_id,
    variant_info, note, price_at_save, position, added_at, deleted_at
  ) VALUES (
    OLD.id, OLD.list_id, OLD.user_id, OLD.product_id, OLD.variant_id,
    OLD.variant_info, OLD.note, OLD.price_at_save, OLD.position, OLD.added_at, now()
  )
  ON CONFLICT DO NOTHING;
  RETURN OLD;
END;
$$;

-- BUG #4: atomic restore-from-trash RPC
CREATE OR REPLACE FUNCTION public.restore_favorite_from_trash(
  _trash_id        uuid,
  _user_id         uuid,
  _fallback_list_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.restore_favorite_from_trash(uuid, uuid, uuid)
  TO authenticated;
;
