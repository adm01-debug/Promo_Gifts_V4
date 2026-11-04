CREATE OR REPLACE FUNCTION public.magazine_update_metadata_v2(p_magazine_id uuid, p_expected_edit_version bigint, p_patch jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_mag public.magazines%ROWTYPE; v_result public.magazines%ROWTYPE;
BEGIN
  v_mag := public.magazine_lock_v2(p_magazine_id, p_expected_edit_version, FALSE);
  IF v_mag.status <> 'draft' THEN RAISE EXCEPTION 'magazine_not_editable' USING ERRCODE='55000'; END IF;
  IF jsonb_typeof(p_patch) IS DISTINCT FROM 'object' OR p_patch='{}'::JSONB OR pg_column_size(p_patch)>262144
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(p_patch) k(key) WHERE key <> ALL(ARRAY['title','subtitle','template_id','branding','content_settings','page_order'])) THEN
    RAISE EXCEPTION 'magazine_patch_invalid' USING ERRCODE='22023';
  END IF;
  IF p_patch ? 'title' AND (jsonb_typeof(p_patch->'title') IS DISTINCT FROM 'string' OR char_length(BTRIM(p_patch->>'title')) NOT BETWEEN 1 AND 200) THEN RAISE EXCEPTION 'magazine_title_invalid' USING ERRCODE='22023'; END IF;
  IF p_patch ? 'subtitle' AND p_patch->'subtitle'<>'null'::JSONB AND (jsonb_typeof(p_patch->'subtitle') IS DISTINCT FROM 'string' OR char_length(p_patch->>'subtitle')>300) THEN RAISE EXCEPTION 'magazine_subtitle_invalid' USING ERRCODE='22023'; END IF;
  IF p_patch ? 'template_id' AND (jsonb_typeof(p_patch->'template_id') IS DISTINCT FROM 'string' OR NOT EXISTS(SELECT 1 FROM public.magazine_templates_catalog WHERE template_id=p_patch->>'template_id')) THEN RAISE EXCEPTION 'magazine_template_invalid' USING ERRCODE='22023'; END IF;
  IF p_patch ? 'branding' AND jsonb_typeof(p_patch->'branding') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'magazine_branding_invalid' USING ERRCODE='22023'; END IF;
  IF p_patch ? 'content_settings' AND (
    jsonb_typeof(p_patch->'content_settings') IS DISTINCT FROM 'object'
    OR (
      p_patch->'content_settings' ? '__magazine_import_v2'
      AND (
        NOT (v_mag.content_settings ? '__magazine_import_v2')
        OR p_patch->'content_settings'->'__magazine_import_v2'
           IS DISTINCT FROM v_mag.content_settings->'__magazine_import_v2'
      )
    )
  ) THEN RAISE EXCEPTION 'magazine_content_invalid' USING ERRCODE='22023'; END IF;
  IF p_patch ? 'page_order' AND NOT public.magazine_validate_page_order_v2(p_magazine_id,NULLIF(p_patch->'page_order','null'::JSONB)) THEN RAISE EXCEPTION 'magazine_page_order_invalid' USING ERRCODE='22023'; END IF;
  UPDATE public.magazines SET
    title=CASE WHEN p_patch?'title' THEN BTRIM(p_patch->>'title') ELSE title END,
    subtitle=CASE WHEN p_patch?'subtitle' THEN COALESCE(p_patch->>'subtitle','') ELSE subtitle END,
    template_id=CASE WHEN p_patch?'template_id' THEN p_patch->>'template_id' ELSE template_id END,
    branding=CASE WHEN p_patch?'branding' THEN p_patch->'branding' ELSE branding END,
    content_settings=CASE WHEN p_patch?'content_settings' THEN
      ((p_patch->'content_settings') - '__magazine_import_v2'::TEXT) || CASE
        WHEN content_settings ? '__magazine_import_v2' THEN
          jsonb_build_object('__magazine_import_v2',content_settings->'__magazine_import_v2')
        ELSE '{}'::JSONB END
      ELSE content_settings END,
    page_order=CASE WHEN p_patch?'page_order' THEN NULLIF(p_patch->'page_order','null'::JSONB) ELSE page_order END,
    edit_version=v_mag.edit_version+1
  WHERE id=p_magazine_id RETURNING * INTO v_result;
  RETURN jsonb_build_object('edit_version',v_result.edit_version,'updated_at',v_result.updated_at);
END $function$
