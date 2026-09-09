\set ON_ERROR_STOP on

-- Expand must coexist with the deployed legacy client until READY/smoke.
DO $$
DECLARE v_sig TEXT;
BEGIN
  IF NOT has_table_privilege('authenticated','public.magazines','INSERT,UPDATE,DELETE')
     OR NOT has_table_privilege('authenticated','public.magazine_items','INSERT,UPDATE,DELETE')
     OR NOT has_table_privilege('service_role','public.magazines','INSERT,UPDATE,DELETE')
     OR NOT has_table_privilege('service_role','public.magazine_items','INSERT,UPDATE,DELETE') THEN
    RAISE EXCEPTION 'expand removed legacy table DML';
  END IF;
  FOREACH v_sig IN ARRAY ARRAY[
    'public.magazine_add_items_atomic(uuid,timestamptz,jsonb)',
    'public.magazine_remove_items_atomic(uuid,timestamptz,uuid[])',
    'public.magazine_reorder_items_atomic(uuid,timestamptz,uuid[])',
    'public.magazine_duplicate_atomic(uuid,text)',
    'public.magazine_update_metadata_atomic(uuid,timestamptz,jsonb)',
    'public.magazine_publish_atomic(uuid)'
  ] LOOP
    IF NOT has_function_privilege('authenticated',v_sig,'EXECUTE')
       OR NOT has_function_privilege('service_role',v_sig,'EXECUTE') THEN
      RAISE EXCEPTION 'expand removed legacy RPC: %',v_sig;
    END IF;
  END LOOP;
END
$$;

SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',FALSE);
SET ROLE authenticated;

INSERT INTO public.magazines(id,owner_id,title,status)
VALUES(
  '10000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000001',
  'Legacy expand draft',
  'draft'
);
INSERT INTO public.magazine_items(
  magazine_id,product_id,product_snapshot,position,overrides
) VALUES (
  '10000000-0000-0000-0000-000000000099',
  '29000000-0000-0000-0000-000000000001',
  '{"name":"legacy direct"}',0,'{}'
);
SELECT public.magazine_update_metadata_atomic(
  '10000000-0000-0000-0000-000000000099',
  (SELECT updated_at FROM public.magazines WHERE id='10000000-0000-0000-0000-000000000099'),
  '{"title":"Legacy expand persisted"}'
);
SELECT public.magazine_add_items_atomic(
  '10000000-0000-0000-0000-000000000099',
  (SELECT updated_at FROM public.magazines WHERE id='10000000-0000-0000-0000-000000000099'),
  '[{"product_id":"29000000-0000-0000-0000-000000000002","product_snapshot":{"name":"legacy rpc"}}]'
);

RESET ROLE;

DO $$
BEGIN
  IF (SELECT title FROM public.magazines WHERE id='10000000-0000-0000-0000-000000000099')
       <> 'Legacy expand persisted'
     OR (SELECT count(*) FROM public.magazine_items WHERE magazine_id='10000000-0000-0000-0000-000000000099') <> 2 THEN
    RAISE EXCEPTION 'legacy draft behavior failed during expand';
  END IF;
END
$$;

SELECT 'MAGAZINE_RPC_EXPAND_COMPATIBILITY_OK' AS result;
