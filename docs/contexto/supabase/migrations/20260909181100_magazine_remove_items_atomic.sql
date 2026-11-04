-- Forward-only, prepared for explicit production approval. Do not apply implicitly.
CREATE OR REPLACE FUNCTION public.magazine_remove_items_atomic(
  p_magazine_id UUID,
  p_expected_updated_at TIMESTAMPTZ,
  p_item_ids UUID[]
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_owner UUID;
  v_status TEXT;
  v_updated_at TIMESTAMPTZ;
  v_matched INTEGER;
  v_removed INTEGER;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'magazine_auth_required' USING ERRCODE = '42501'; END IF;
  IF p_item_ids IS NULL OR cardinality(p_item_ids) NOT BETWEEN 1 AND 500 OR array_position(p_item_ids, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'magazine_item_ids_invalid' USING ERRCODE = '22023';
  END IF;
  IF (SELECT COUNT(DISTINCT id) FROM unnest(p_item_ids) AS ids(id)) <> cardinality(p_item_ids) THEN
    RAISE EXCEPTION 'magazine_item_ids_duplicated' USING ERRCODE = '22023';
  END IF;

  SELECT owner_id, status::TEXT, updated_at INTO v_owner, v_status, v_updated_at
    FROM public.magazines WHERE id = p_magazine_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'magazine_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_owner <> v_actor AND NOT COALESCE(public.has_role(v_actor, 'admin'::public.app_role), FALSE) THEN
    RAISE EXCEPTION 'magazine_forbidden' USING ERRCODE = '42501';
  END IF;
  IF v_status <> 'draft' THEN RAISE EXCEPTION 'magazine_not_editable' USING ERRCODE = '55000'; END IF;
  IF v_updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'magazine_edit_conflict' USING ERRCODE = '40001';
  END IF;

  SELECT COUNT(*) INTO v_matched FROM public.magazine_items
   WHERE magazine_id = p_magazine_id AND id = ANY(p_item_ids);
  IF v_matched <> cardinality(p_item_ids) THEN
    RAISE EXCEPTION 'magazine_item_not_found' USING ERRCODE = 'P0002';
  END IF;
  DELETE FROM public.magazine_items WHERE magazine_id = p_magazine_id AND id = ANY(p_item_ids);
  GET DIAGNOSTICS v_removed = ROW_COUNT;
  UPDATE public.magazines SET updated_at = clock_timestamp() WHERE id = p_magazine_id
  RETURNING updated_at INTO v_updated_at;
  RETURN jsonb_build_object('removed', v_removed, 'updated_at', v_updated_at);
END;
$$;

REVOKE ALL ON FUNCTION public.magazine_remove_items_atomic(UUID, TIMESTAMPTZ, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.magazine_remove_items_atomic(UUID, TIMESTAMPTZ, UUID[]) TO authenticated, service_role;
