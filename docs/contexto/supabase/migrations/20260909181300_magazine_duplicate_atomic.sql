-- Forward-only, prepared for explicit production approval. Do not apply implicitly.
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
  v_new_id UUID;
  v_item_count INTEGER;
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
    v_source.content_settings, v_source.page_order, 'draft', NULL, NULL, NULL
  ) RETURNING id INTO v_new_id;

  INSERT INTO public.magazine_items (
    magazine_id, product_id, product_snapshot, variant_color_name,
    position, page_number, overrides
  )
  SELECT v_new_id, product_id, product_snapshot, variant_color_name,
         position, page_number, overrides
    FROM public.magazine_items
   WHERE magazine_id = p_source_magazine_id
   ORDER BY position;
  GET DIAGNOSTICS v_item_count = ROW_COUNT;
  RETURN jsonb_build_object('magazine_id', v_new_id, 'items_copied', v_item_count);
END;
$$;

REVOKE ALL ON FUNCTION public.magazine_duplicate_atomic(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.magazine_duplicate_atomic(UUID, TEXT) TO authenticated, service_role;
