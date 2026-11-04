-- Forward-only correction: SQL NULL must not become a successful no-op.
CREATE OR REPLACE FUNCTION public.magazine_add_items_atomic(
  p_magazine_id UUID,
  p_expected_updated_at TIMESTAMPTZ,
  p_items JSONB
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
  v_base_position NUMERIC;
  v_current_count INTEGER;
  v_new_count INTEGER;
  v_inserted INTEGER;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'magazine_auth_required' USING ERRCODE = '42501';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'magazine_items_invalid' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_items) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'magazine_items_invalid' USING ERRCODE = '22023';
  END IF;

  SELECT owner_id, status::TEXT, updated_at
    INTO v_owner, v_status, v_updated_at
    FROM public.magazines
   WHERE id = p_magazine_id AND deleted_at IS NULL
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'magazine_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_owner <> v_actor AND NOT COALESCE(public.has_role(v_actor, 'admin'::public.app_role), FALSE) THEN
    RAISE EXCEPTION 'magazine_forbidden' USING ERRCODE = '42501';
  END IF;
  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'magazine_not_editable' USING ERRCODE = '55000';
  END IF;
  IF v_updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'magazine_edit_conflict' USING ERRCODE = '40001';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_items) AS entry(value)
     WHERE jsonb_typeof(value) IS DISTINCT FROM 'object'
        OR value->>'product_id' IS NULL
        OR jsonb_typeof(value->'product_snapshot') IS DISTINCT FROM 'object'
  ) THEN
    RAISE EXCEPTION 'magazine_items_invalid' USING ERRCODE = '22023';
  END IF;

  SELECT COUNT(*), COALESCE(MAX(position), -1) + 1
    INTO v_current_count, v_base_position
    FROM public.magazine_items
   WHERE magazine_id = p_magazine_id;
  SELECT COUNT(*) INTO v_new_count
    FROM (
      SELECT DISTINCT (entry.value->>'product_id')::UUID AS product_id
        FROM jsonb_array_elements(p_items) AS entry(value)
    ) AS payload
   WHERE NOT EXISTS (
     SELECT 1 FROM public.magazine_items mi
      WHERE mi.magazine_id = p_magazine_id AND mi.product_id = payload.product_id
   );
  IF v_current_count + v_new_count > 500 THEN
    RAISE EXCEPTION 'magazine_item_limit_exceeded' USING ERRCODE = '22023';
  END IF;

  WITH payload AS (
    SELECT DISTINCT ON ((entry.value->>'product_id')::UUID)
           (entry.value->>'product_id')::UUID AS product_id,
           entry.value->'product_snapshot' AS product_snapshot,
           NULLIF(entry.value->>'variant_color_name', '') AS variant_color_name,
           CASE WHEN entry.value ? 'page_number' THEN (entry.value->>'page_number')::INTEGER END AS page_number,
           COALESCE(entry.value->'overrides', '{}'::JSONB) AS overrides,
           entry.ordinality
      FROM jsonb_array_elements(p_items) WITH ORDINALITY AS entry(value, ordinality)
     ORDER BY (entry.value->>'product_id')::UUID, entry.ordinality
  ), ordered AS (
    SELECT *, ROW_NUMBER() OVER (ORDER BY ordinality) - 1 AS position_offset
      FROM payload
  )
  INSERT INTO public.magazine_items (
    magazine_id, product_id, product_snapshot, variant_color_name, position, page_number, overrides
  )
  SELECT p_magazine_id, product_id, product_snapshot, variant_color_name,
         v_base_position + position_offset, page_number, overrides
    FROM ordered
  ON CONFLICT (magazine_id, product_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  UPDATE public.magazines SET updated_at = clock_timestamp() WHERE id = p_magazine_id
  RETURNING updated_at INTO v_updated_at;
  RETURN jsonb_build_object('inserted', v_inserted, 'updated_at', v_updated_at);
END;
$$;

REVOKE ALL ON FUNCTION public.magazine_add_items_atomic(UUID, TIMESTAMPTZ, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.magazine_add_items_atomic(UUID, TIMESTAMPTZ, JSONB) TO authenticated, service_role;
