-- Migration 044a: Revoke anon EXECUTE on fn_log_search_analytics
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'fn_log_search_analytics'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.fn_log_search_analytics FROM anon;
    RAISE NOTICE '[044] ✓ REVOKE EXECUTE ON fn_log_search_analytics FROM anon';
  ELSE
    RAISE NOTICE '[044] - fn_log_search_analytics not found — skipping';
  END IF;
END;
$$;

-- Migration 044b: Move relocatable extensions from public to extensions schema
DO $$
DECLARE
  r              RECORD;
  v_ok           int := 0;
  v_skip         int := 0;
  v_fail         int := 0;
  v_candidates   text[] := ARRAY[
    'uuid-ossp', 'pgcrypto', 'pg_trgm', 'fuzzystrmatch', 'unaccent',
    'tablefunc', 'cube', 'earthdistance', 'citext', 'hstore', 'ltree',
    'intarray', 'btree_gin', 'btree_gist', 'isn', 'lo', 'bloom', 'tcn',
    'seg', 'dict_int', 'dict_xsyn'
  ];
  v_ext_name     text;
  v_ext_schema   text;
  v_relocatable  boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'extensions') THEN
    CREATE SCHEMA IF NOT EXISTS extensions;
  END IF;

  FOREACH v_ext_name IN ARRAY v_candidates
  LOOP
    SELECT n.nspname, e.extrelocatable
    INTO v_ext_schema, v_relocatable
    FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = v_ext_name;

    IF NOT FOUND THEN v_skip := v_skip + 1; CONTINUE; END IF;
    IF v_ext_schema <> 'public' THEN v_skip := v_skip + 1; CONTINUE; END IF;
    IF NOT v_relocatable THEN
      RAISE WARNING '[044] % is in public but NOT relocatable — leaving', v_ext_name;
      v_skip := v_skip + 1; CONTINUE;
    END IF;

    BEGIN
      EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions', v_ext_name);
      v_ok := v_ok + 1;
      RAISE NOTICE '✓ [044] Moved % from public to extensions schema', v_ext_name;
    EXCEPTION WHEN OTHERS THEN
      v_fail := v_fail + 1;
      RAISE WARNING '[044] ✗ Could not move %: %', v_ext_name, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE '[044] Extension moves: moved=%, skipped=%, failed=%', v_ok, v_skip, v_fail;
END;
$$;;
