CREATE OR REPLACE FUNCTION public.magazine_import_local_v2(p_idempotency_key text, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_actor UUID := auth.uid();
  v_key TEXT := BTRIM(p_idempotency_key);
  v_key_hash TEXT;
  v_fingerprint TEXT;
  v_existing public.magazines%ROWTYPE;
  v_existing_count INTEGER;
  v_title TEXT;
  v_subtitle TEXT;
  v_template_id TEXT;
  v_status TEXT;
  v_branding JSONB;
  v_content JSONB;
  v_items JSONB;
  v_order JSONB;
  v_pages JSONB;
  v_item JSONB;
  v_new_id UUID;
  v_new_item_id UUID;
  v_local_item_id TEXT;
  v_item_map JSONB := '{}'::JSONB;
  v_items_imported INTEGER := 0;
  v_raw_ref_count INTEGER := 0;
  v_mapped_ref_count INTEGER := 0;
  v_version BIGINT;
  v_previous_import_setting TEXT;
  v_result public.magazines%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'magazine_auth_required' USING ERRCODE = '42501';
  END IF;
  IF p_idempotency_key IS NULL OR char_length(v_key) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'magazine_import_idempotency_key_invalid' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_payload) IS DISTINCT FROM 'object'
     OR pg_column_size(p_payload) > 2097152 THEN
    RAISE EXCEPTION 'magazine_import_payload_invalid' USING ERRCODE = '22023';
  END IF;

  v_key_hash := encode(extensions.digest(v_actor::TEXT || ':' || v_key, 'sha256'), 'hex');
  v_fingerprint := encode(extensions.digest(p_payload::TEXT, 'sha256'), 'hex');
  PERFORM pg_advisory_xact_lock(hashtextextended(v_actor::TEXT || ':' || v_key, 0));

  SELECT count(*) INTO v_existing_count
  FROM public.magazines
  WHERE owner_id = v_actor
    AND content_settings #>> '{__magazine_import_v2,key_hash}' = v_key_hash;
  IF v_existing_count > 1 THEN
    RAISE EXCEPTION 'magazine_import_idempotency_ambiguous' USING ERRCODE = '55000';
  ELSIF v_existing_count = 1 THEN
    SELECT * INTO v_existing
    FROM public.magazines
    WHERE owner_id = v_actor
      AND content_settings #>> '{__magazine_import_v2,key_hash}' = v_key_hash
    FOR UPDATE;
    IF v_existing.content_settings #>> '{__magazine_import_v2,fingerprint}'
       IS DISTINCT FROM v_fingerprint THEN
      RAISE EXCEPTION 'magazine_import_idempotency_key_reused' USING ERRCODE = '22023';
    END IF;
    RETURN jsonb_build_object(
      'magazine_id', v_existing.id,
      'edit_version', v_existing.edit_version,
      'status', v_existing.status,
      'public_token', v_existing.public_token,
      'items_imported', (SELECT count(*) FROM public.magazine_items WHERE magazine_id = v_existing.id),
      'idempotent', TRUE
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(p_payload) field(key)
    WHERE key <> ALL (ARRAY[
      'title','subtitle','templateId','branding','content','pageOrder','status','items'
    ])
  ) THEN
    RAISE EXCEPTION 'magazine_import_payload_unknown_fields' USING ERRCODE = '22023';
  END IF;

  v_title := BTRIM(p_payload->>'title');
  v_subtitle := COALESCE(p_payload->>'subtitle', '');
  v_template_id := COALESCE(p_payload->>'templateId', 'editorial-vogue');
  v_status := COALESCE(p_payload->>'status', 'draft');
  v_branding := COALESCE(p_payload->'branding', '{}'::JSONB);
  v_content := COALESCE(p_payload->'content', '{}'::JSONB);
  v_items := COALESCE(p_payload->'items', '[]'::JSONB);
  v_order := NULLIF(p_payload->'pageOrder', 'null'::JSONB);

  IF char_length(v_title) NOT BETWEEN 1 AND 200
     OR char_length(v_subtitle) > 300
     OR jsonb_typeof(v_branding) IS DISTINCT FROM 'object'
     OR jsonb_typeof(v_content) IS DISTINCT FROM 'object'
     OR v_content ? '__magazine_import_v2'
     OR v_status <> ALL (ARRAY['draft','published','archived'])
     OR NOT EXISTS (
       SELECT 1 FROM public.magazine_templates_catalog
       WHERE template_id = v_template_id
     )
     OR jsonb_typeof(v_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(v_items) > 500 THEN
    RAISE EXCEPTION 'magazine_import_payload_invalid' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_items) entry(value)
    WHERE jsonb_typeof(value) IS DISTINCT FROM 'object'
       OR EXISTS (
         SELECT 1 FROM jsonb_object_keys(
           CASE WHEN jsonb_typeof(value) = 'object' THEN value ELSE '{}'::JSONB END
         ) field(key)
         WHERE key <> ALL (ARRAY[
           'localItemId','productId','productSnapshot','variantColorName',
           'position','pageNumber','overrides'
         ])
       )
       OR jsonb_typeof(value->'localItemId') IS DISTINCT FROM 'string'
       OR char_length(BTRIM(value->>'localItemId')) NOT BETWEEN 1 AND 200
       OR (value->>'productId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       OR jsonb_typeof(value->'productSnapshot') IS DISTINCT FROM 'object'
       OR jsonb_typeof(value->'position') IS DISTINCT FROM 'number'
       OR (value->>'position')::NUMERIC <> trunc((value->>'position')::NUMERIC)
       OR (value->>'position')::NUMERIC NOT BETWEEN 0 AND 1000000000
       OR (value ? 'variantColorName' AND value->'variantColorName' <> 'null'::JSONB AND (
         jsonb_typeof(value->'variantColorName') IS DISTINCT FROM 'string'
         OR char_length(value->>'variantColorName') > 200
       ))
       OR (value ? 'pageNumber' AND value->'pageNumber' <> 'null'::JSONB AND (
         jsonb_typeof(value->'pageNumber') IS DISTINCT FROM 'number'
         OR (value->>'pageNumber')::NUMERIC <> trunc((value->>'pageNumber')::NUMERIC)
         OR (value->>'pageNumber')::INTEGER NOT BETWEEN 1 AND 200
       ))
       OR (value ? 'overrides' AND jsonb_typeof(value->'overrides') IS DISTINCT FROM 'object')
  ) OR (
    SELECT count(*) FROM jsonb_array_elements(v_items)
  ) <> (
    SELECT count(DISTINCT BTRIM(value->>'localItemId')) FROM jsonb_array_elements(v_items)
  ) OR (
    SELECT count(*) FROM jsonb_array_elements(v_items)
  ) <> (
    SELECT count(DISTINCT (value->>'productId')::UUID) FROM jsonb_array_elements(v_items)
  ) OR (
    SELECT count(*) FROM jsonb_array_elements(v_items)
  ) <> (
    SELECT count(DISTINCT (value->>'position')::NUMERIC) FROM jsonb_array_elements(v_items)
  ) THEN
    RAISE EXCEPTION 'magazine_import_items_invalid' USING ERRCODE = '22023';
  END IF;

  v_previous_import_setting := current_setting('app.magazine_import_v2', TRUE);
  PERFORM set_config('app.magazine_import_v2', 'on', TRUE);
  INSERT INTO public.magazines(
    owner_id, organization_id, title, subtitle, template_id,
    branding, content_settings, page_order, status
  ) VALUES (
    v_actor, NULL, v_title, v_subtitle, v_template_id,
    v_branding,
    v_content || jsonb_build_object('__magazine_import_v2', jsonb_build_object(
      'key_hash', v_key_hash,
      'fingerprint', v_fingerprint
    )),
    NULL,
    'draft'
  ) RETURNING id INTO v_new_id;
  PERFORM set_config('app.magazine_import_v2', COALESCE(v_previous_import_setting, ''), TRUE);

  FOR v_item IN
    SELECT value FROM jsonb_array_elements(v_items) WITH ORDINALITY entry(value, ordinality)
    ORDER BY (value->>'position')::NUMERIC, ordinality
  LOOP
    v_local_item_id := BTRIM(v_item->>'localItemId');
    INSERT INTO public.magazine_items(
      magazine_id, product_id, product_snapshot, variant_color_name,
      position, page_number, overrides
    ) VALUES (
      v_new_id,
      (v_item->>'productId')::UUID,
      v_item->'productSnapshot',
      NULLIF(v_item->>'variantColorName', ''),
      v_items_imported,
      (v_item->>'pageNumber')::INTEGER,
      COALESCE(v_item->'overrides', '{}'::JSONB)
    ) RETURNING id INTO v_new_item_id;
    v_item_map := v_item_map || jsonb_build_object(v_local_item_id, v_new_item_id::TEXT);
    v_items_imported := v_items_imported + 1;
  END LOOP;

  IF jsonb_typeof(v_order) = 'object'
     AND jsonb_typeof(v_order->'pages') = 'array' THEN
    SELECT count(*) INTO v_raw_ref_count
    FROM jsonb_array_elements(v_order->'pages') page(value)
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(page.value->'itemIds') = 'array'
           THEN page.value->'itemIds' ELSE '[]'::JSONB END
    ) item(value);

    SELECT COALESCE(jsonb_agg(
      CASE WHEN jsonb_typeof(page.value->'itemIds') = 'array' THEN
        jsonb_set(
          page.value,
          '{itemIds}',
          COALESCE((
            SELECT jsonb_agg(to_jsonb(v_item_map->>(item.value #>> '{}')) ORDER BY item.ordinality)
            FROM jsonb_array_elements(page.value->'itemIds') WITH ORDINALITY item(value, ordinality)
            WHERE jsonb_typeof(item.value) = 'string'
              AND v_item_map ? (item.value #>> '{}')
          ), '[]'::JSONB),
          FALSE
        )
      ELSE page.value END
      ORDER BY page.ordinality
    ), '[]'::JSONB) INTO v_pages
    FROM jsonb_array_elements(v_order->'pages') WITH ORDINALITY page(value, ordinality);
    v_order := jsonb_set(v_order, '{pages}', v_pages, FALSE);

    SELECT count(*) INTO v_mapped_ref_count
    FROM jsonb_array_elements(v_order->'pages') page(value)
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(page.value->'itemIds') = 'array'
           THEN page.value->'itemIds' ELSE '[]'::JSONB END
    ) item(value);
    IF v_mapped_ref_count <> v_raw_ref_count THEN
      RAISE EXCEPTION 'magazine_import_page_order_reference_missing' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF NOT public.magazine_validate_page_order_v2(v_new_id, v_order) THEN
    RAISE EXCEPTION 'magazine_import_page_order_invalid' USING ERRCODE = '22023';
  END IF;
  IF v_order IS NOT NULL THEN
    UPDATE public.magazines SET page_order = v_order
    WHERE id = v_new_id RETURNING edit_version INTO v_version;
  ELSE
    SELECT edit_version INTO v_version FROM public.magazines WHERE id = v_new_id;
  END IF;

  IF v_status = 'archived' THEN
    PERFORM public.magazine_archive_v2(v_new_id, v_version);
  END IF;
  SELECT * INTO v_result FROM public.magazines WHERE id = v_new_id;
  RETURN jsonb_build_object(
    'magazine_id', v_result.id,
    'edit_version', v_result.edit_version,
    'status', v_result.status,
    'public_token', v_result.public_token,
    'items_imported', v_items_imported,
    'idempotent', FALSE
  );
END;
$function$
