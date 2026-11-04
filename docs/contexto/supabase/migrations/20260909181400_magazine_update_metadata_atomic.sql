-- Forward-only, prepared for explicit production approval. Do not apply implicitly.
CREATE OR REPLACE FUNCTION public.magazine_update_metadata_atomic(
  p_magazine_id UUID,
  p_expected_updated_at TIMESTAMPTZ,
  p_patch JSONB
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
  v_unknown_keys TEXT[];
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'magazine_auth_required' USING ERRCODE = '42501'; END IF;
  IF jsonb_typeof(p_patch) <> 'object' OR p_patch = '{}'::JSONB THEN
    RAISE EXCEPTION 'magazine_patch_invalid' USING ERRCODE = '22023';
  END IF;
  SELECT ARRAY(
    SELECT key FROM jsonb_object_keys(p_patch) AS keys(key)
     WHERE key <> ALL (ARRAY['title', 'subtitle', 'template_id', 'branding', 'content_settings', 'page_order'])
  ) INTO v_unknown_keys;
  IF cardinality(v_unknown_keys) > 0 THEN
    RAISE EXCEPTION 'magazine_patch_unknown_fields: %', array_to_string(v_unknown_keys, ',')
      USING ERRCODE = '22023';
  END IF;
  IF p_patch ? 'title' AND (
    jsonb_typeof(p_patch->'title') <> 'string'
    OR char_length(BTRIM(p_patch->>'title')) NOT BETWEEN 1 AND 200
  ) THEN RAISE EXCEPTION 'magazine_title_invalid' USING ERRCODE = '22023'; END IF;
  IF p_patch ? 'subtitle' AND p_patch->'subtitle' <> 'null'::JSONB
     AND (jsonb_typeof(p_patch->'subtitle') <> 'string' OR char_length(p_patch->>'subtitle') > 300) THEN
    RAISE EXCEPTION 'magazine_subtitle_invalid' USING ERRCODE = '22023';
  END IF;
  IF p_patch ? 'branding' AND jsonb_typeof(p_patch->'branding') <> 'object' THEN
    RAISE EXCEPTION 'magazine_branding_invalid' USING ERRCODE = '22023';
  END IF;
  IF p_patch ? 'content_settings' AND jsonb_typeof(p_patch->'content_settings') <> 'object' THEN
    RAISE EXCEPTION 'magazine_content_invalid' USING ERRCODE = '22023';
  END IF;
  IF p_patch ? 'page_order' AND p_patch->'page_order' <> 'null'::JSONB
     AND NOT (
       jsonb_typeof(p_patch->'page_order') = 'array'
       OR (
         jsonb_typeof(p_patch->'page_order') = 'object'
         AND p_patch->'page_order'->>'version' = '2'
         AND jsonb_typeof(p_patch->'page_order'->'pages') = 'array'
         AND jsonb_array_length(p_patch->'page_order'->'pages') <= 200
       )
     ) THEN RAISE EXCEPTION 'magazine_page_order_invalid' USING ERRCODE = '22023'; END IF;
  IF p_patch ? 'page_order'
     AND jsonb_typeof(p_patch->'page_order') = 'object'
     AND (
       jsonb_array_length(p_patch->'page_order'->'pages') < 2
       OR p_patch->'page_order'->'pages'->0->>'kind' <> 'cover'
       OR p_patch->'page_order'->'pages'->-1->>'kind' NOT IN ('contact', 'back-cover')
       OR (
         SELECT COUNT(*) FROM jsonb_array_elements(p_patch->'page_order'->'pages') AS page(value)
          WHERE value->>'kind' = 'cover'
       ) <> 1
       OR (
         SELECT COUNT(*) FROM jsonb_array_elements(p_patch->'page_order'->'pages') AS page(value)
          WHERE value->>'kind' IN ('contact', 'back-cover')
       ) <> 1
       OR EXISTS (
         SELECT 1 FROM jsonb_array_elements(p_patch->'page_order'->'pages') AS page(value)
          WHERE jsonb_typeof(value) <> 'object'
             OR jsonb_typeof(value->'id') <> 'string'
             OR char_length(value->>'id') NOT BETWEEN 1 AND 120
             OR value->>'kind' NOT IN ('cover', 'institutional', 'section', 'products', 'contact', 'back-cover')
             OR (value ? 'title' AND (jsonb_typeof(value->'title') <> 'string' OR char_length(value->>'title') > 120))
             OR (value ? 'body' AND (jsonb_typeof(value->'body') <> 'string' OR char_length(value->>'body') > 800))
             OR (value ? 'itemIds' AND jsonb_typeof(value->'itemIds') <> 'array')
             OR (value ? 'itemIds' AND jsonb_array_length(value->'itemIds') > 500)
             OR (value ? 'itemIds' AND EXISTS (
               SELECT 1 FROM jsonb_array_elements(value->'itemIds') AS item_id(value)
                WHERE jsonb_typeof(item_id.value) <> 'string'
             ))
       )
       OR (
         SELECT COUNT(*) FROM jsonb_array_elements(p_patch->'page_order'->'pages') AS page(value)
       ) <> (
         SELECT COUNT(DISTINCT value->>'id')
           FROM jsonb_array_elements(p_patch->'page_order'->'pages') AS page(value)
       )
     ) THEN RAISE EXCEPTION 'magazine_page_order_invalid' USING ERRCODE = '22023'; END IF;

  SELECT owner_id, status::TEXT, updated_at INTO v_owner, v_status, v_updated_at
    FROM public.magazines WHERE id = p_magazine_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'magazine_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_owner <> v_actor AND NOT COALESCE(public.has_role(v_actor, 'admin'::public.app_role), FALSE) THEN
    RAISE EXCEPTION 'magazine_forbidden' USING ERRCODE = '42501';
  END IF;
  IF v_status <> 'draft' THEN RAISE EXCEPTION 'magazine_not_editable' USING ERRCODE = '55000'; END IF;
  IF v_updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RETURN jsonb_build_object('conflict', TRUE, 'current_updated_at', v_updated_at);
  END IF;

  UPDATE public.magazines
     SET title = CASE WHEN p_patch ? 'title' THEN BTRIM(p_patch->>'title') ELSE title END,
         subtitle = CASE WHEN p_patch ? 'subtitle' THEN COALESCE(p_patch->>'subtitle', '') ELSE subtitle END,
         template_id = CASE WHEN p_patch ? 'template_id' THEN p_patch->>'template_id' ELSE template_id END,
         branding = CASE WHEN p_patch ? 'branding' THEN p_patch->'branding' ELSE branding END,
         content_settings = CASE WHEN p_patch ? 'content_settings' THEN p_patch->'content_settings' ELSE content_settings END,
         page_order = CASE WHEN p_patch ? 'page_order' THEN NULLIF(p_patch->'page_order', 'null'::JSONB) ELSE page_order END,
         updated_at = clock_timestamp()
   WHERE id = p_magazine_id
   RETURNING updated_at INTO v_updated_at;
  RETURN jsonb_build_object('conflict', FALSE, 'updated_at', v_updated_at);
END;
$$;

REVOKE ALL ON FUNCTION public.magazine_update_metadata_atomic(UUID, TIMESTAMPTZ, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.magazine_update_metadata_atomic(UUID, TIMESTAMPTZ, JSONB) TO authenticated, service_role;
