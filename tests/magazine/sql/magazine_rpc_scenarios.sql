\set ON_ERROR_STOP on

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', FALSE);

DO $$
DECLARE result JSONB;
BEGIN
  result := public.magazine_add_items_atomic(
    '10000000-0000-0000-0000-000000000001',
    '2026-09-09T12:00:00Z',
    '[
      {"product_id":"20000000-0000-0000-0000-000000000001","product_snapshot":{"name":"A"}},
      {"product_id":"20000000-0000-0000-0000-000000000002","product_snapshot":{"name":"B"}}
    ]'::JSONB
  );
  IF result->>'inserted' <> '2' THEN RAISE EXCEPTION 'add assertion failed: %', result; END IF;
END;
$$;

DO $$
BEGIN
  PERFORM public.magazine_add_items_atomic(
    '10000000-0000-0000-0000-000000000001',
    '2026-09-09T12:00:00Z',
    '[{"product_id":"20000000-0000-0000-0000-000000000003","product_snapshot":{"name":"C"}}]'::JSONB
  );
  RAISE EXCEPTION 'stale CAS was accepted';
EXCEPTION WHEN serialization_failure THEN NULL;
END;
$$;

DO $$
DECLARE current_revision TIMESTAMPTZ;
BEGIN
  SELECT updated_at INTO current_revision FROM public.magazines
   WHERE id = '10000000-0000-0000-0000-000000000001';
  PERFORM public.magazine_update_metadata_atomic(
    '10000000-0000-0000-0000-000000000001', current_revision,
    '{"page_order":{"version":2,"pages":[{"id":"same","kind":"cover"},{"id":"same","kind":"contact"}]}}'::JSONB
  );
  RAISE EXCEPTION 'invalid structured page order was accepted';
EXCEPTION WHEN invalid_parameter_value THEN NULL;
END;
$$;

DO $$
DECLARE current_revision TIMESTAMPTZ;
BEGIN
  SELECT updated_at INTO current_revision FROM public.magazines
   WHERE id = '10000000-0000-0000-0000-000000000001';
  PERFORM public.magazine_update_metadata_atomic(
    '10000000-0000-0000-0000-000000000001', current_revision,
    '{"page_order":{"version":2,"pages":[{"id":"cover","kind":"cover"},{"id":"orphan"},{"id":"contact","kind":"contact"}]}}'::JSONB
  );
  RAISE EXCEPTION 'page without kind was accepted';
EXCEPTION WHEN invalid_parameter_value THEN NULL;
END;
$$;

DO $$
DECLARE current_revision TIMESTAMPTZ;
BEGIN
  SELECT updated_at INTO current_revision FROM public.magazines
   WHERE id = '10000000-0000-0000-0000-000000000001';
  PERFORM public.magazine_update_metadata_atomic(
    '10000000-0000-0000-0000-000000000001', current_revision,
    jsonb_build_object('subtitle', repeat('x', 301))
  );
  RAISE EXCEPTION 'subtitle above canonical limit was accepted';
EXCEPTION WHEN invalid_parameter_value THEN NULL;
END;
$$;

DO $$
DECLARE current_revision TIMESTAMPTZ;
BEGIN
  SELECT updated_at INTO current_revision FROM public.magazines
   WHERE id = '10000000-0000-0000-0000-000000000001';
  PERFORM public.magazine_reorder_items_atomic(
    '10000000-0000-0000-0000-000000000001', current_revision, ARRAY[]::UUID[]
  );
  RAISE EXCEPTION 'incomplete reorder was accepted';
EXCEPTION WHEN invalid_parameter_value THEN NULL;
END;
$$;

DO $$
DECLARE current_revision TIMESTAMPTZ; first_id UUID; second_id UUID; result JSONB;
BEGIN
  SELECT updated_at INTO current_revision FROM public.magazines
   WHERE id = '10000000-0000-0000-0000-000000000001';
  SELECT id INTO first_id FROM public.magazine_items
   WHERE magazine_id = '10000000-0000-0000-0000-000000000001' ORDER BY position LIMIT 1;
  SELECT id INTO second_id FROM public.magazine_items
   WHERE magazine_id = '10000000-0000-0000-0000-000000000001' ORDER BY position DESC LIMIT 1;
  result := public.magazine_reorder_items_atomic(
    '10000000-0000-0000-0000-000000000001', current_revision, ARRAY[second_id, first_id]
  );
  IF result->>'reordered' <> '2' THEN RAISE EXCEPTION 'reorder assertion failed: %', result; END IF;
  IF (SELECT id FROM public.magazine_items
       WHERE magazine_id = '10000000-0000-0000-0000-000000000001' ORDER BY position LIMIT 1) <> second_id
  THEN RAISE EXCEPTION 'reorder position assertion failed'; END IF;
END;
$$;

DO $$
DECLARE current_revision TIMESTAMPTZ; remove_id UUID; result JSONB;
BEGIN
  SELECT updated_at INTO current_revision FROM public.magazines
   WHERE id = '10000000-0000-0000-0000-000000000001';
  SELECT id INTO remove_id FROM public.magazine_items
   WHERE magazine_id = '10000000-0000-0000-0000-000000000001' ORDER BY position DESC LIMIT 1;
  result := public.magazine_remove_items_atomic(
    '10000000-0000-0000-0000-000000000001', current_revision, ARRAY[remove_id]
  );
  IF result->>'removed' <> '1' THEN RAISE EXCEPTION 'remove assertion failed: %', result; END IF;
END;
$$;

DO $$
DECLARE current_revision TIMESTAMPTZ; result JSONB; stale_revision TIMESTAMPTZ;
BEGIN
  SELECT updated_at INTO current_revision FROM public.magazines
   WHERE id = '10000000-0000-0000-0000-000000000001';
  stale_revision := current_revision;
  result := public.magazine_update_metadata_atomic(
    '10000000-0000-0000-0000-000000000001', current_revision,
    '{"title":"Revista atualizada","page_order":{"version":2,"pages":[{"id":"cover","kind":"cover"},{"id":"contact","kind":"contact"}]}}'::JSONB
  );
  IF result->>'conflict' <> 'false' THEN RAISE EXCEPTION 'metadata assertion failed: %', result; END IF;
  result := public.magazine_update_metadata_atomic(
    '10000000-0000-0000-0000-000000000001', stale_revision, '{"title":"Perda silenciosa"}'::JSONB
  );
  IF result->>'conflict' <> 'true' THEN RAISE EXCEPTION 'metadata conflict assertion failed: %', result; END IF;
  IF (SELECT title FROM public.magazines WHERE id = '10000000-0000-0000-0000-000000000001') <> 'Revista atualizada'
  THEN RAISE EXCEPTION 'stale metadata overwrote winner'; END IF;
END;
$$;

DO $$
BEGIN
  PERFORM public.magazine_update_metadata_atomic(
    '10000000-0000-0000-0000-000000000001',
    (SELECT updated_at FROM public.magazines WHERE id = '10000000-0000-0000-0000-000000000001'),
    '{"public_token":"forbidden"}'::JSONB
  );
  RAISE EXCEPTION 'unknown metadata field was accepted';
EXCEPTION WHEN invalid_parameter_value THEN NULL;
END;
$$;

DO $$
DECLARE result JSONB; duplicate_id UUID; source_item_id UUID; duplicate_item_id UUID; current_revision TIMESTAMPTZ;
BEGIN
  SELECT id INTO source_item_id FROM public.magazine_items
   WHERE magazine_id = '10000000-0000-0000-0000-000000000001' ORDER BY position LIMIT 1;
  SELECT updated_at INTO current_revision FROM public.magazines
   WHERE id = '10000000-0000-0000-0000-000000000001';
  result := public.magazine_update_metadata_atomic(
    '10000000-0000-0000-0000-000000000001', current_revision,
    jsonb_build_object(
      'page_order',
      jsonb_build_object(
        'version', 2,
        'pages', jsonb_build_array(
          jsonb_build_object('id', 'cover', 'kind', 'cover'),
          jsonb_build_object('id', 'products', 'kind', 'products', 'itemIds', jsonb_build_array(source_item_id::TEXT)),
          jsonb_build_object('id', 'contact', 'kind', 'contact')
        )
      )
    )
  );
  IF result->>'conflict' <> 'false' THEN RAISE EXCEPTION 'source page order setup failed: %', result; END IF;
  result := public.magazine_duplicate_atomic(
    '10000000-0000-0000-0000-000000000001', 'Cópia segura'
  );
  duplicate_id := (result->>'magazine_id')::UUID;
  SELECT id INTO duplicate_item_id FROM public.magazine_items
   WHERE magazine_id = duplicate_id ORDER BY position LIMIT 1;
  IF (SELECT status FROM public.magazines WHERE id = duplicate_id) <> 'draft'
     OR (SELECT public_token FROM public.magazines WHERE id = duplicate_id) IS NOT NULL
     OR (SELECT COUNT(*) FROM public.magazine_items WHERE magazine_id = duplicate_id) <> 1
     OR (SELECT page_order->'pages'->1->'itemIds'->>0 FROM public.magazines WHERE id = duplicate_id) <> duplicate_item_id::TEXT
     OR duplicate_item_id = source_item_id
  THEN RAISE EXCEPTION 'duplicate assertion failed: %', result; END IF;
END;
$$;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', FALSE);
DO $$
BEGIN
  PERFORM public.magazine_duplicate_atomic('10000000-0000-0000-0000-000000000001', NULL);
  RAISE EXCEPTION 'foreign user was accepted';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$$;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', FALSE);
DO $$
DECLARE result JSONB;
BEGIN
  result := public.magazine_duplicate_atomic(
    '10000000-0000-0000-0000-000000000001', 'Cópia administrativa'
  );
  IF result->>'magazine_id' IS NULL THEN RAISE EXCEPTION 'admin duplicate failed'; END IF;
END;
$$;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', FALSE);
UPDATE public.magazines SET status = 'published', updated_at = clock_timestamp()
 WHERE id = '10000000-0000-0000-0000-000000000001';
DO $$
BEGIN
  PERFORM public.magazine_add_items_atomic(
    '10000000-0000-0000-0000-000000000001',
    (SELECT updated_at FROM public.magazines WHERE id = '10000000-0000-0000-0000-000000000001'),
    '[{"product_id":"20000000-0000-0000-0000-000000000004","product_snapshot":{"name":"D"}}]'::JSONB
  );
  RAISE EXCEPTION 'published magazine mutation was accepted';
EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;
END;
$$;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.magazine_add_items_atomic(uuid,timestamptz,jsonb)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.magazine_remove_items_atomic(uuid,timestamptz,uuid[])', 'EXECUTE')
     OR has_function_privilege('anon', 'public.magazine_reorder_items_atomic(uuid,timestamptz,uuid[])', 'EXECUTE')
     OR has_function_privilege('anon', 'public.magazine_duplicate_atomic(uuid,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.magazine_update_metadata_atomic(uuid,timestamptz,jsonb)', 'EXECUTE')
  THEN RAISE EXCEPTION 'anon retained EXECUTE'; END IF;
END;
$$;

SELECT 'MAGAZINE_RPC_SCENARIOS_OK' AS result;
