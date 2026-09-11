DO $$
DECLARE
  r      RECORD;
  v_ok   int := 0;
  v_fail int := 0;
BEGIN
  FOR r IN
    SELECT c.relname AS tablename, c.oid
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND has_table_privilege('anon', c.oid, 'SELECT')
    ORDER BY c.relname
  LOOP
    BEGIN
      EXECUTE format('REVOKE SELECT ON public.%I FROM anon', r.tablename);
      v_ok := v_ok + 1;
      RAISE NOTICE '[062] REVOKE SELECT ON public.% FROM anon', r.tablename;
    EXCEPTION WHEN OTHERS THEN
      v_fail := v_fail + 1;
      RAISE WARNING '[062] Failed to revoke SELECT on %: %', r.tablename, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '[062] Table sweep: revoked=%, failed=%', v_ok, v_fail;

  IF v_fail > 0 THEN
    RAISE WARNING '[062] % revocation(s) failed', v_fail;
  END IF;
END;
$$;

DO $$
DECLARE
  v_remaining      int := 0;
  v_total_anon_rel int := 0;
  r                RECORD;
BEGIN
  SELECT count(*) INTO v_remaining
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
    AND has_table_privilege('anon', c.oid, 'SELECT');

  IF v_remaining = 0 THEN
    RAISE NOTICE '[062] All public tables: anon SELECT revoked';
  ELSE
    RAISE WARNING '[062] % table(s) still anon SELECT-able', v_remaining;
    FOR r IN
      SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind IN ('r', 'p')
        AND has_table_privilege('anon', c.oid, 'SELECT')
      ORDER BY c.relname
    LOOP
      RAISE WARNING '[062] Still accessible: %', r.relname;
    END LOOP;
  END IF;

  SELECT count(*) INTO v_total_anon_rel
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p', 'm', 'v')
    AND has_table_privilege('anon', c.oid, 'SELECT');

  IF v_total_anon_rel = 0 THEN
    RAISE NOTICE '[062] No public relation is SELECT-able by anon — pg_graphql_anon_table_exposed cleared';
  ELSE
    RAISE WARNING '[062] % public relation(s) still anon SELECT-able', v_total_anon_rel;
  END IF;

  RAISE NOTICE 'Migration 062 complete.';
END;
$$;;
