\set ON_ERROR_STOP on

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', FALSE);

DO $$
DECLARE v_sig TEXT;
BEGIN
  IF has_table_privilege('authenticated', 'public.magazines', 'INSERT')
     OR has_table_privilege('authenticated', 'public.magazines', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.magazines', 'DELETE')
     OR has_table_privilege('authenticated', 'public.magazine_items', 'INSERT')
     OR has_table_privilege('authenticated', 'public.magazine_items', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.magazine_items', 'DELETE')
     OR has_table_privilege('service_role', 'public.magazines', 'INSERT,UPDATE,DELETE')
     OR has_table_privilege('service_role', 'public.magazine_items', 'INSERT,UPDATE,DELETE') THEN
    RAISE EXCEPTION 'authenticated retained direct Magazine DML';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.magazine_create_v2(uuid,text,text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.magazine_add_items_v2(uuid,bigint,jsonb)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.magazine_archive_v2(uuid,bigint)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.magazine_publish_atomic(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'RPC v2/v1 ACL mismatch';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname LIKE 'magazine_%_v2'
      AND p.proname<>'magazine_page_order_remove_items_v2'
      AND (NOT p.prosecdef OR NOT (p.proconfig @> ARRAY['search_path=public, pg_temp']
        OR p.proconfig @> ARRAY['search_path=public, extensions, pg_temp']))
  ) THEN
    RAISE EXCEPTION 'RPC v2/helper SECURITY DEFINER or search_path mismatch';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname=ANY(ARRAY[
      'magazine_create_v2','magazine_update_metadata_v2','magazine_add_items_v2',
      'magazine_remove_items_v2','magazine_reorder_items_v2','magazine_update_item_v2',
      'magazine_publish_v2','magazine_unpublish_v2','magazine_archive_v2',
      'magazine_reactivate_v2','magazine_soft_delete_v2','magazine_restore_v2',
      'magazine_duplicate_v2','magazine_import_local_v2'
    ]) AND (p.proargnames IS NULL OR cardinality(p.proargnames)<p.pronargs)
  ) THEN
    RAISE EXCEPTION 'RPC v2 missing PostgREST argument names';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid IN ('public.magazines'::regclass,'public.magazine_items'::regclass)
      AND NOT tgisinternal
      AND tgname IN ('trg_magazines_on_publish','trg_magazines_updated_at','trg_magazine_items_updated_at')
  ) OR (SELECT count(*) FROM pg_trigger WHERE tgrelid='public.magazines'::regclass AND NOT tgisinternal AND tgname='trg_magazines_guard_and_version_v2')<>1
     OR (SELECT count(*) FROM pg_trigger WHERE tgrelid='public.magazine_items'::regclass AND NOT tgisinternal AND tgname='trg_magazine_items_guard_v2')<>1 THEN
    RAISE EXCEPTION 'Magazine trigger replacement mismatch';
  END IF;
  IF public.magazine_validate_page_order_v2('10000000-0000-0000-0000-000000000001','[201]'::JSONB) THEN
    RAISE EXCEPTION 'legacy page_order above limit accepted';
  END IF;
  FOREACH v_sig IN ARRAY ARRAY[
    'public.magazine_create_v2(uuid,text,text)',
    'public.magazine_update_metadata_v2(uuid,bigint,jsonb)',
    'public.magazine_add_items_v2(uuid,bigint,jsonb)',
    'public.magazine_remove_items_v2(uuid,bigint,uuid[])',
    'public.magazine_reorder_items_v2(uuid,bigint,uuid[])',
    'public.magazine_update_item_v2(uuid,bigint,uuid,jsonb)',
    'public.magazine_publish_v2(uuid,bigint)',
    'public.magazine_unpublish_v2(uuid,bigint)',
    'public.magazine_archive_v2(uuid,bigint)',
    'public.magazine_reactivate_v2(uuid,bigint)',
    'public.magazine_soft_delete_v2(uuid,bigint)',
    'public.magazine_restore_v2(uuid,bigint)',
    'public.magazine_duplicate_v2(uuid,bigint,text,text)',
    'public.magazine_import_local_v2(text,jsonb)'
  ] LOOP
    IF NOT has_function_privilege('authenticated',v_sig,'EXECUTE')
       OR NOT has_function_privilege('service_role',v_sig,'EXECUTE')
       OR has_function_privilege('anon',v_sig,'EXECUTE') THEN
      RAISE EXCEPTION 'RPC v2 ACL mismatch: %',v_sig;
    END IF;
  END LOOP;
  FOREACH v_sig IN ARRAY ARRAY[
    'public.magazine_add_items_atomic(uuid,timestamptz,jsonb)',
    'public.magazine_remove_items_atomic(uuid,timestamptz,uuid[])',
    'public.magazine_reorder_items_atomic(uuid,timestamptz,uuid[])',
    'public.magazine_duplicate_atomic(uuid,text)',
    'public.magazine_update_metadata_atomic(uuid,timestamptz,jsonb)',
    'public.magazine_publish_atomic(uuid)'
  ] LOOP
    IF has_function_privilege('authenticated',v_sig,'EXECUTE')
       OR has_function_privilege('service_role',v_sig,'EXECUTE')
       OR has_function_privilege('anon',v_sig,'EXECUTE') THEN
      RAISE EXCEPTION 'legacy RPC retained execution: %',v_sig;
    END IF;
  END LOOP;
END
$$;

CREATE TEMP TABLE magazine_v2_context (
  magazine_id UUID NOT NULL,
  first_item_id UUID,
  second_item_id UUID,
  duplicate_id UUID
) ON COMMIT PRESERVE ROWS;

WITH created AS (
  SELECT public.magazine_create_v2(NULL, 'Revista v2', 'editorial-vogue') result
)
INSERT INTO magazine_v2_context(magazine_id)
SELECT (result->>'magazine_id')::UUID FROM created;

DO $$
DECLARE v_id UUID; v_result JSONB;
BEGIN
  SELECT magazine_id INTO v_id FROM magazine_v2_context;
  IF (SELECT owner_id FROM public.magazines WHERE id=v_id)
       <> '00000000-0000-0000-0000-000000000001'
     OR (SELECT status FROM public.magazines WHERE id=v_id) <> 'draft'
     OR (SELECT edit_version FROM public.magazines WHERE id=v_id) <> 0 THEN
    RAISE EXCEPTION 'create v2 invariant failed';
  END IF;
  v_result := public.magazine_add_items_v2(v_id, 0, '[
    {"product_id":"21000000-0000-0000-0000-000000000001","product_snapshot":{"name":"A"}},
    {"product_id":"21000000-0000-0000-0000-000000000002","product_snapshot":{"name":"B"}}
  ]');
  IF v_result->>'inserted'<>'2' OR v_result->>'edit_version'<>'1' THEN
    RAISE EXCEPTION 'add v2 failed: %',v_result;
  END IF;
  UPDATE magazine_v2_context SET
    first_item_id=(SELECT id FROM public.magazine_items WHERE magazine_id=v_id ORDER BY position LIMIT 1),
    second_item_id=(SELECT id FROM public.magazine_items WHERE magazine_id=v_id ORDER BY position DESC LIMIT 1);
  v_result := public.magazine_add_items_v2(v_id, 1, '[
    {"product_id":"21000000-0000-0000-0000-000000000001","product_snapshot":{"ignored":true}}
  ]');
  IF v_result->>'inserted'<>'0' OR v_result->>'edit_version'<>'1' THEN
    RAISE EXCEPTION 'idempotent add advanced version: %',v_result;
  END IF;
END
$$;

DO $$
DECLARE v_id UUID; v_first UUID; v_second UUID; v_result JSONB; v_tx_start TIMESTAMPTZ:=transaction_timestamp();
BEGIN
  SELECT magazine_id,first_item_id,second_item_id INTO v_id,v_first,v_second FROM magazine_v2_context;
  v_result:=public.magazine_update_metadata_v2(v_id,1,jsonb_build_object('page_order',jsonb_build_object(
    'version',2,'pages',jsonb_build_array(
      jsonb_build_object('id','cover','kind','cover'),
      jsonb_build_object('id','products','kind','products','itemIds',jsonb_build_array(v_first::TEXT,v_second::TEXT)),
      jsonb_build_object('id','contact','kind','contact')
    ))));
  IF v_result->>'edit_version'<>'2' THEN RAISE EXCEPTION 'metadata version failed: %',v_result; END IF;
  BEGIN
    PERFORM public.magazine_update_metadata_v2(v_id,2,'{"page_order":{"version":2,"pages":[{"id":"cover","kind":"cover"},{"id":"products","kind":"products","itemIds":["ffffffff-ffff-ffff-ffff-ffffffffffff"]},{"id":"contact","kind":"contact"}]}}');
    RAISE EXCEPTION 'orphan page item accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  IF (SELECT edit_version FROM public.magazines WHERE id=v_id)<>2 THEN RAISE EXCEPTION 'invalid page order advanced version'; END IF;
  PERFORM pg_sleep(0.01);
  v_result:=public.magazine_update_item_v2(v_id,2,v_first,'{"overrides":{"showPrice":false},"page_number":1}');
  IF v_result->>'edit_version'<>'3' THEN RAISE EXCEPTION 'update item failed: %',v_result; END IF;
  IF (SELECT updated_at FROM public.magazine_items WHERE id=v_first)<=v_tx_start THEN
    RAISE EXCEPTION 'item updated_at did not use wall clock';
  END IF;
  BEGIN
    PERFORM public.magazine_update_item_v2(v_id,3,v_first,jsonb_build_object(
      'position',(SELECT position FROM public.magazine_items WHERE id=v_second)
    ));
    RAISE EXCEPTION 'transient duplicate item position accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  IF (SELECT edit_version FROM public.magazines WHERE id=v_id)<>3 THEN
    RAISE EXCEPTION 'failed item position update advanced parent version';
  END IF;
  v_result:=public.magazine_reorder_items_v2(v_id,3,ARRAY[v_second,v_first]);
  IF v_result->>'edit_version'<>'4' THEN RAISE EXCEPTION 'reorder failed: %',v_result; END IF;
  v_result:=public.magazine_remove_items_v2(v_id,4,ARRAY[v_first]);
  IF v_result->>'removed'<>'1' OR v_result->>'edit_version'<>'5' THEN RAISE EXCEPTION 'remove failed: %',v_result; END IF;
  IF (SELECT page_order::TEXT FROM public.magazines WHERE id=v_id) LIKE '%'||v_first::TEXT||'%' THEN
    RAISE EXCEPTION 'removed item reference survived page_order cleanup';
  END IF;
END
$$;

DO $$
DECLARE v_id UUID;
BEGIN
  SELECT magazine_id INTO v_id FROM magazine_v2_context;
  BEGIN
    PERFORM public.magazine_add_items_v2(v_id,5,'[{"product_id":"21000000-0000-0000-0000-000000000003","product_snapshot":{},"unexpected":true}]');
    RAISE EXCEPTION 'unknown add-item field accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',TRUE);
  BEGIN
    PERFORM public.magazine_update_metadata_v2(v_id,5,'{"title":"forbidden owner"}');
    RAISE EXCEPTION 'non-owner mutation accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END
$$;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', FALSE);

DO $$
DECLARE v_id UUID; v_result JSONB; v_again JSONB;
BEGIN
  SELECT magazine_id INTO v_id FROM magazine_v2_context;
  v_result:=public.magazine_duplicate_v2(v_id,5,'duplicate-request-1','Cópia v2');
  v_again:=public.magazine_duplicate_v2(v_id,5,'duplicate-request-1','Cópia v2');
  IF v_result->>'magazine_id' IS DISTINCT FROM v_again->>'magazine_id'
     OR v_result->>'idempotent'<>'false' OR v_again->>'idempotent'<>'true' THEN
    RAISE EXCEPTION 'duplicate idempotency failed: %, %',v_result,v_again;
  END IF;
  UPDATE magazine_v2_context SET duplicate_id=(v_result->>'magazine_id')::UUID;
  BEGIN
    PERFORM public.magazine_duplicate_v2(v_id,5,'duplicate-request-1','Different title');
    RAISE EXCEPTION 'idempotency key reuse accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
END
$$;

DO $$
DECLARE v_id UUID; v_result JSONB; v_version BIGINT;
BEGIN
  SELECT magazine_id INTO v_id FROM magazine_v2_context;
  -- A caller cannot force a weak token: publish clears it before the trigger.
  UPDATE public.magazines SET public_token='x' WHERE id=v_id RETURNING edit_version INTO v_version;
  v_result:=public.magazine_publish_v2(v_id,v_version);
  IF length(v_result->>'public_token')<>48 OR v_result->>'public_token' !~ '^[0-9a-f]{48}$' THEN
    RAISE EXCEPTION 'publish did not replace weak token: %',v_result;
  END IF;
  v_version:=(v_result->>'edit_version')::BIGINT;
  BEGIN
    PERFORM public.magazine_update_metadata_v2(v_id,v_version,'{"title":"forbidden"}');
    RAISE EXCEPTION 'published mutation accepted';
  EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;
  END;
  BEGIN
    UPDATE public.magazine_items SET overrides='{}' WHERE magazine_id=v_id;
    RAISE EXCEPTION 'published child mutation accepted';
  EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;
  END;
  BEGIN
    UPDATE public.magazines SET status='archived',title='mixed mutation' WHERE id=v_id;
    RAISE EXCEPTION 'published lifecycle transition mutated content';
  EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;
  END;
  v_result:=public.magazine_archive_v2(v_id,v_version);
  IF (SELECT status FROM public.magazines WHERE id=v_id)<>'archived'
     OR (SELECT public_token FROM public.magazines WHERE id=v_id) IS NOT NULL
     OR v_result->>'edit_version'<>(v_version+1)::TEXT THEN
    RAISE EXCEPTION 'published archive failed: %',v_result;
  END IF;
  v_version:=(v_result->>'edit_version')::BIGINT;
  v_result:=public.magazine_archive_v2(v_id,v_version);
  IF v_result->>'edit_version'<>v_version::TEXT THEN RAISE EXCEPTION 'idempotent archive advanced version: %',v_result; END IF;
  v_result:=public.magazine_reactivate_v2(v_id,v_version);
  v_version:=(v_result->>'edit_version')::BIGINT;
  v_result:=public.magazine_publish_v2(v_id,v_version);
  v_version:=(v_result->>'edit_version')::BIGINT;
  v_result:=public.magazine_unpublish_v2(v_id,v_version);
  IF v_result->>'edit_version'<>(v_version+1)::TEXT OR (SELECT public_token FROM public.magazines WHERE id=v_id) IS NOT NULL THEN RAISE EXCEPTION 'unpublish failed: %',v_result; END IF;
  v_version:=(v_result->>'edit_version')::BIGINT;
  v_result:=public.magazine_soft_delete_v2(v_id,v_version);
  IF (SELECT status FROM public.magazines WHERE id=v_id)<>'archived' OR (SELECT deleted_at FROM public.magazines WHERE id=v_id) IS NULL THEN RAISE EXCEPTION 'soft delete failed'; END IF;
  v_version:=(v_result->>'edit_version')::BIGINT;
  BEGIN
    UPDATE public.magazines SET deleted_at=NULL,title='mixed restore' WHERE id=v_id;
    RAISE EXCEPTION 'restore lifecycle transition mutated content';
  EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;
  END;
  v_result:=public.magazine_restore_v2(v_id,v_version);
  IF (SELECT status FROM public.magazines WHERE id=v_id)<>'draft' OR (SELECT deleted_at FROM public.magazines WHERE id=v_id) IS NOT NULL THEN RAISE EXCEPTION 'restore failed'; END IF;
  v_version:=(v_result->>'edit_version')::BIGINT;
  v_result:=public.magazine_archive_v2(v_id,v_version);
  v_version:=(v_result->>'edit_version')::BIGINT;
  v_result:=public.magazine_reactivate_v2(v_id,v_version);
  IF (SELECT status FROM public.magazines WHERE id=v_id)<>'draft' THEN RAISE EXCEPTION 'reactivate failed'; END IF;
END
$$;

DO $$
DECLARE v_id UUID; v_version BIGINT; v_again JSONB;
BEGIN
  SELECT magazine_id INTO v_id FROM magazine_v2_context;
  SELECT edit_version INTO v_version FROM public.magazines WHERE id=v_id;
  v_again:=public.magazine_duplicate_v2(v_id,5,'duplicate-request-1','Cópia v2');
  IF v_again->>'idempotent'<>'true' THEN RAISE EXCEPTION 'duplicate retry after source mutation failed: %',v_again; END IF;
  BEGIN
    PERFORM public.magazine_update_metadata_v2(v_id,v_version-1,'{"title":"stale"}');
    RAISE EXCEPTION 'stale CAS accepted';
  EXCEPTION WHEN serialization_failure THEN NULL;
  END;
END
$$;

SELECT 'MAGAZINE_RPC_V2_SCENARIOS_OK' AS result;
