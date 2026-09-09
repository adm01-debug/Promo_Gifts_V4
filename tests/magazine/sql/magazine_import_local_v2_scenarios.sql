\set ON_ERROR_STOP on

SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',FALSE);

CREATE TEMP TABLE magazine_import_context(
  payload JSONB NOT NULL,
  magazine_id UUID,
  edit_version BIGINT
) ON COMMIT PRESERVE ROWS;

INSERT INTO magazine_import_context(payload) VALUES ('{
  "title":"Importada local",
  "subtitle":"Preservada",
  "templateId":"editorial-vogue",
  "branding":{"primaryColor":"#123456"},
  "content":{"showPrices":false},
  "status":"published",
  "items":[
    {"localItemId":"item_local_b","productId":"24000000-0000-0000-0000-000000000002","productSnapshot":{"name":"B"},"position":20,"pageNumber":2,"overrides":{}},
    {"localItemId":"item_local_a","productId":"24000000-0000-0000-0000-000000000001","productSnapshot":{"name":"A"},"position":10,"pageNumber":1,"overrides":{"showPrice":false}}
  ],
  "pageOrder":{"version":2,"pages":[
    {"id":"cover","kind":"cover","title":"Capa"},
    {"id":"products","kind":"products","itemIds":["item_local_b","item_local_a"]},
    {"id":"contact","kind":"contact","body":"Contato"}
  ]}
}');

DO $$
DECLARE v_payload JSONB; v_result JSONB; v_again JSONB; v_copy JSONB; v_id UUID; v_copy_id UUID; v_refs TEXT[]; v_direct_version BIGINT;
BEGIN
  SELECT payload INTO v_payload FROM magazine_import_context;
  v_result:=public.magazine_import_local_v2(
    p_idempotency_key=>'local_mag_1',p_payload=>v_payload
  );
  v_id:=(v_result->>'magazine_id')::UUID;
  UPDATE magazine_import_context SET magazine_id=v_id,edit_version=(v_result->>'edit_version')::BIGINT;
  IF v_result->>'idempotent'<>'false' OR v_result->>'items_imported'<>'2'
     OR v_result->>'status'<>'draft' OR v_result->'public_token'<>'null'::JSONB THEN
    RAISE EXCEPTION 'initial local import failed: %',v_result;
  END IF;
  IF (SELECT owner_id FROM public.magazines WHERE id=v_id)<>'00000000-0000-0000-0000-000000000001'
     OR (SELECT title FROM public.magazines WHERE id=v_id)<>'Importada local'
     OR (SELECT content_settings->>'showPrices' FROM public.magazines WHERE id=v_id)<>'false'
     OR length((SELECT content_settings #>> '{__magazine_import_v2,fingerprint}' FROM public.magazines WHERE id=v_id))<>64 THEN
    RAISE EXCEPTION 'imported header/marker mismatch';
  END IF;
  SELECT array_agg(item.value #>> '{}' ORDER BY item.ordinality) INTO v_refs
  FROM public.magazines m
  CROSS JOIN LATERAL jsonb_array_elements(m.page_order->'pages'->1->'itemIds')
    WITH ORDINALITY item(value,ordinality)
  WHERE m.id=v_id;
  IF cardinality(v_refs)<>2
     OR v_refs[1]=(SELECT id::TEXT FROM public.magazine_items WHERE magazine_id=v_id AND product_id='24000000-0000-0000-0000-000000000001')
     OR v_refs[1]<>(SELECT id::TEXT FROM public.magazine_items WHERE magazine_id=v_id AND product_id='24000000-0000-0000-0000-000000000002')
     OR (SELECT page_order->'pages'->0->>'title' FROM public.magazines WHERE id=v_id)<>'Capa'
     OR (SELECT page_order->'pages'->2->>'body' FROM public.magazines WHERE id=v_id)<>'Contato' THEN
    RAISE EXCEPTION 'pageOrder was not preserved/remapped: %',v_refs;
  END IF;
  IF (SELECT array_agg(product_id ORDER BY position) FROM public.magazine_items WHERE magazine_id=v_id)
       <> ARRAY['24000000-0000-0000-0000-000000000001'::UUID,'24000000-0000-0000-0000-000000000002'::UUID] THEN
    RAISE EXCEPTION 'local item positions were not normalized in source order';
  END IF;
  v_again:=public.magazine_import_local_v2('local_mag_1',v_payload);
  IF v_again->>'idempotent'<>'true' OR v_again->>'magazine_id'<>v_id::TEXT
     OR v_again->>'edit_version'<>v_result->>'edit_version' THEN
    RAISE EXCEPTION 'successful retry was not idempotent: %, %',v_result,v_again;
  END IF;
  v_result:=public.magazine_update_metadata_v2(
    v_id,(v_result->>'edit_version')::BIGINT,
    jsonb_build_object(
      'content_settings',
      (SELECT content_settings FROM public.magazines WHERE id=v_id) || '{"showPrices":true}'::JSONB
    )
  );
  IF length((SELECT content_settings #>> '{__magazine_import_v2,fingerprint}' FROM public.magazines WHERE id=v_id))<>64 THEN
    RAISE EXCEPTION 'metadata update removed import idempotency marker';
  END IF;
  UPDATE public.magazines SET content_settings='{"manual":true}' WHERE id=v_id
  RETURNING edit_version INTO v_direct_version;
  IF length((SELECT content_settings #>> '{__magazine_import_v2,fingerprint}' FROM public.magazines WHERE id=v_id))<>64 THEN
    RAISE EXCEPTION 'direct content replacement removed import idempotency marker';
  END IF;
  BEGIN
    UPDATE public.magazines SET content_settings=jsonb_set(
      content_settings,'{__magazine_import_v2,fingerprint}','"tampered"'
    ) WHERE id=v_id;
    RAISE EXCEPTION 'import marker tampering was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  v_copy:=public.magazine_duplicate_v2(
    v_id,v_direct_version,'imported-magazine-copy','Imported copy'
  );
  v_copy_id:=(v_copy->>'magazine_id')::UUID;
  IF (SELECT content_settings ? '__magazine_import_v2' FROM public.magazines WHERE id=v_copy_id) THEN
    RAISE EXCEPTION 'duplicate copied import idempotency marker';
  END IF;
  v_again:=public.magazine_import_local_v2('local_mag_1',v_payload);
  IF v_again->>'magazine_id'<>v_id::TEXT
     OR v_again->>'edit_version'<>v_direct_version::TEXT THEN
    RAISE EXCEPTION 'retry after metadata mutation lost idempotency: %',v_again;
  END IF;
  UPDATE magazine_import_context SET edit_version=v_direct_version;
END
$$;

DO $$
DECLARE v_payload JSONB; v_before_magazines BIGINT; v_before_items BIGINT; v_id UUID;
BEGIN
  SELECT payload,magazine_id INTO v_payload,v_id FROM magazine_import_context;
  SELECT count(*) INTO v_before_magazines FROM public.magazines;
  SELECT count(*) INTO v_before_items FROM public.magazine_items;
  BEGIN
    PERFORM public.magazine_import_local_v2('local_mag_1',jsonb_set(v_payload,'{title}','"different"'));
    RAISE EXCEPTION 'idempotency key accepted divergent payload';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  IF (SELECT count(*) FROM public.magazines)<>v_before_magazines
     OR (SELECT count(*) FROM public.magazine_items)<>v_before_items
     OR (SELECT title FROM public.magazines WHERE id=v_id)<>'Importada local' THEN
    RAISE EXCEPTION 'idempotency mismatch changed data';
  END IF;

  BEGIN
    PERFORM public.magazine_import_local_v2('local_mag_rollback','{
      "title":"Must rollback","templateId":"editorial-vogue","status":"draft",
      "items":[{"localItemId":"known","productId":"25000000-0000-0000-0000-000000000001","productSnapshot":{},"position":0}],
      "pageOrder":{"version":2,"pages":[{"id":"cover","kind":"cover"},{"id":"products","kind":"products","itemIds":["missing"]},{"id":"contact","kind":"contact"}]}
    }');
    RAISE EXCEPTION 'late invalid page reference was accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  IF (SELECT count(*) FROM public.magazines)<>v_before_magazines
     OR (SELECT count(*) FROM public.magazine_items)<>v_before_items
     OR EXISTS(SELECT 1 FROM public.magazines WHERE title='Must rollback') THEN
    RAISE EXCEPTION 'failed import did not roll back atomically';
  END IF;
END
$$;

DO $$
DECLARE v_result JSONB; v_id UUID;
BEGIN
  v_result:=public.magazine_import_local_v2('local_mag_archived','{
    "title":"Archived import","templateId":"editorial-vogue","status":"archived",
    "items":[],"pageOrder":[3,1]
  }');
  v_id:=(v_result->>'magazine_id')::UUID;
  IF v_result->>'status'<>'archived' OR v_result->>'idempotent'<>'false'
     OR (SELECT page_order FROM public.magazines WHERE id=v_id) IS DISTINCT FROM '[3,1]'::JSONB
     OR (SELECT archived_at FROM public.magazines WHERE id=v_id) IS NULL THEN
    RAISE EXCEPTION 'archived/legacy pageOrder import failed: %',v_result;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT has_function_privilege('authenticated','public.magazine_import_local_v2(text,jsonb)','EXECUTE')
     OR NOT has_function_privilege('service_role','public.magazine_import_local_v2(text,jsonb)','EXECUTE')
     OR has_function_privilege('anon','public.magazine_import_local_v2(text,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'local import RPC ACL mismatch';
  END IF;
  IF has_table_privilege('authenticated','public.magazines','INSERT,UPDATE,DELETE')
     OR has_table_privilege('authenticated','public.magazine_items','INSERT,UPDATE,DELETE')
     OR has_table_privilege('service_role','public.magazines','INSERT,UPDATE,DELETE')
     OR has_table_privilege('service_role','public.magazine_items','INSERT,UPDATE,DELETE')
     OR NOT has_table_privilege('authenticated','public.magazines','SELECT')
     OR NOT has_table_privilege('service_role','public.magazines','SELECT') THEN
    RAISE EXCEPTION 'contract table ACL mismatch';
  END IF;
  BEGIN
    INSERT INTO public.magazines(owner_id,title,content_settings)
    VALUES(
      '00000000-0000-0000-0000-000000000001','Forged marker',
      '{"__magazine_import_v2":{"key_hash":"fake","fingerprint":"fake"}}'
    );
    RAISE EXCEPTION 'direct import marker fabrication was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END
$$;

SET ROLE authenticated;
SELECT public.magazine_import_local_v2(
  'authenticated-role-import',
  '{"title":"Authenticated role import","templateId":"editorial-vogue","status":"draft","items":[],"pageOrder":null}'
);
RESET ROLE;

SET ROLE service_role;
SELECT public.magazine_import_local_v2(
  'service-role-import-with-user-jwt',
  '{"title":"Service role import","templateId":"editorial-vogue","status":"draft","items":[],"pageOrder":null}'
);
RESET ROLE;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.magazines WHERE owner_id='00000000-0000-0000-0000-000000000001'
        AND title IN ('Authenticated role import','Service role import'))<>2 THEN
    RAISE EXCEPTION 'granted roles could not execute local import RPC';
  END IF;
END
$$;

SELECT 'MAGAZINE_IMPORT_LOCAL_V2_SCENARIOS_OK' AS result;
