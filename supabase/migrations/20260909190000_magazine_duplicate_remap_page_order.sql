-- Forward-only correction: structured page_order must reference the cloned item IDs.
CREATE OR REPLACE FUNCTION public.magazine_duplicate_atomic(
  p_source_magazine_id UUID,
  p_title TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_source public.magazines%ROWTYPE;
  v_source_item public.magazine_items%ROWTYPE;
  v_new_id UUID;
  v_new_item_id UUID;
  v_item_count INTEGER := 0;
  v_id_map JSONB := '{}'::JSONB;
  v_mapped_pages JSONB;
  v_mapped_page_order JSONB;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'magazine_auth_required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_source FROM public.magazines
   WHERE id = p_source_magazine_id AND deleted_at IS NULL FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'magazine_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_source.owner_id <> v_actor
     AND NOT COALESCE(public.has_role(v_actor, 'admin'::public.app_role), FALSE) THEN
    RAISE EXCEPTION 'magazine_forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.magazines (
    owner_id, organization_id, title, subtitle, template_id, branding,
    content_settings, page_order, status, public_token, published_at, archived_at
  ) VALUES (
    v_actor, v_source.organization_id,
    LEFT(COALESCE(NULLIF(BTRIM(p_title), ''), v_source.title || ' (cópia)'), 200),
    v_source.subtitle, v_source.template_id, v_source.branding,
    v_source.content_settings, NULL, 'draft', NULL, NULL, NULL
  ) RETURNING id INTO v_new_id;

  FOR v_source_item IN
    SELECT * FROM public.magazine_items
     WHERE magazine_id = p_source_magazine_id
     ORDER BY position, id
  LOOP
    INSERT INTO public.magazine_items (
      magazine_id, product_id, product_snapshot, variant_color_name,
      position, page_number, overrides
    ) VALUES (
      v_new_id, v_source_item.product_id, v_source_item.product_snapshot,
      v_source_item.variant_color_name, v_source_item.position,
      v_source_item.page_number, v_source_item.overrides
    ) RETURNING id INTO v_new_item_id;
    v_id_map := v_id_map || jsonb_build_object(v_source_item.id::TEXT, v_new_item_id::TEXT);
    v_item_count := v_item_count + 1;
  END LOOP;

  v_mapped_page_order := v_source.page_order;
  IF jsonb_typeof(v_source.page_order) = 'object'
     AND v_source.page_order->>'version' = '2'
     AND jsonb_typeof(v_source.page_order->'pages') = 'array' THEN
    SELECT COALESCE(
      jsonb_agg(
        CASE
          WHEN jsonb_typeof(page.value->'itemIds') = 'array' THEN
            jsonb_set(
              page.value,
              '{itemIds}',
              COALESCE(
                (
                  SELECT jsonb_agg(to_jsonb(v_id_map->>(item.value #>> '{}')) ORDER BY item.ordinality)
                    FROM jsonb_array_elements(page.value->'itemIds')
                      WITH ORDINALITY AS item(value, ordinality)
                   WHERE jsonb_typeof(item.value) = 'string'
                     AND v_id_map ? (item.value #>> '{}')
                ),
                '[]'::JSONB
              ),
              FALSE
            )
          ELSE page.value
        END
        ORDER BY page.ordinality
      ),
      '[]'::JSONB
    ) INTO v_mapped_pages
      FROM jsonb_array_elements(v_source.page_order->'pages')
        WITH ORDINALITY AS page(value, ordinality);
    v_mapped_page_order := jsonb_set(v_source.page_order, '{pages}', v_mapped_pages, FALSE);
  END IF;

  UPDATE public.magazines
     SET page_order = v_mapped_page_order
   WHERE id = v_new_id;

  RETURN jsonb_build_object('magazine_id', v_new_id, 'items_copied', v_item_count);
END;
$$;

REVOKE ALL ON FUNCTION public.magazine_duplicate_atomic(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.magazine_duplicate_atomic(UUID, TEXT) TO authenticated, service_role;
