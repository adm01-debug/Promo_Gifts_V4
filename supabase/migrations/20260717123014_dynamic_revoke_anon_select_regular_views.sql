DO $$
DECLARE
  r      RECORD;
  v_ok   int := 0;
  v_fail int := 0;
BEGIN
  -- Select only views where anon already has SELECT — avoids sub-block variable issue
  FOR r IN
    SELECT c.relname AS view_name, c.oid
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'v'
      AND has_table_privilege('anon', c.oid, 'SELECT')
    ORDER BY c.relname
  LOOP
    BEGIN
      EXECUTE format('REVOKE SELECT ON public.%I FROM anon', r.view_name);
      v_ok := v_ok + 1;
      RAISE NOTICE '[060] REVOKE SELECT ON public.% FROM anon', r.view_name;
    EXCEPTION WHEN OTHERS THEN
      v_fail := v_fail + 1;
      RAISE WARNING '[060] Could not revoke SELECT on %: %', r.view_name, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '[060] View sweep: revoked=%, failed=%', v_ok, v_fail;

  IF v_fail > 0 THEN
    RAISE WARNING '[060] % revocation(s) failed', v_fail;
  END IF;

  IF v_ok = 0 THEN
    RAISE NOTICE '[060] No views with anon SELECT found — already clean';
  END IF;
END;
$$;

DO $$
DECLARE
  v_remaining      int := 0;
  v_total_anon_rel int := 0;
  r                RECORD;
BEGIN
  -- Check remaining views
  SELECT count(*) INTO v_remaining
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'v'
    AND has_table_privilege('anon', c.oid, 'SELECT');

  IF v_remaining = 0 THEN
    RAISE NOTICE '[060] All public regular views: anon SELECT revoked';
  ELSE
    RAISE WARNING '[060] % view(s) still anon SELECT-able', v_remaining;
    FOR r IN
      SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'v'
        AND has_table_privilege('anon', c.oid, 'SELECT')
      ORDER BY c.relname
    LOOP
      RAISE WARNING '[060] Still accessible: %', r.relname;
    END LOOP;
  END IF;

  -- Combined check: tables + matviews + regular views
  SELECT count(*) INTO v_total_anon_rel
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'm', 'v')
    AND has_table_privilege('anon', c.oid, 'SELECT');

  IF v_total_anon_rel = 0 THEN
    RAISE NOTICE '[060] No public relation (table/matview/view) is directly SELECT-able by anon';
  ELSE
    RAISE WARNING '[060] % public relation(s) still anon SELECT-able', v_total_anon_rel;
  END IF;

  RAISE NOTICE 'Migration 060 complete.';
END;
$$;;
