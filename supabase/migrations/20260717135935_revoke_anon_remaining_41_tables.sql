
DO $$
DECLARE
  r      RECORD;
  v_ok   int := 0;
  v_skip int := 0;
BEGIN
  FOR r IN
    SELECT c.relname, c.oid, c.relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'v', 'm')
      AND has_table_privilege('anon', c.oid, 'SELECT')
    ORDER BY c.relname
  LOOP
    BEGIN
      EXECUTE format('REVOKE SELECT ON public.%I FROM PUBLIC', r.relname);
      EXECUTE format('REVOKE SELECT ON public.%I FROM anon', r.relname);
      EXECUTE format('GRANT  SELECT ON public.%I TO authenticated', r.relname);
      v_ok := v_ok + 1;
      RAISE NOTICE '[069] Fixed public.% (relkind=%): revoked anon/PUBLIC, granted authenticated',
        r.relname, r.relkind;
    EXCEPTION WHEN OTHERS THEN
      v_skip := v_skip + 1;
      RAISE WARNING '[069] Failed on public.%: %', r.relname, SQLERRM;
    END;
  END LOOP;

  IF v_ok = 0 AND v_skip = 0 THEN
    RAISE NOTICE '[069] Phase 1: No anon-accessible public objects found — already clean';
  ELSE
    RAISE NOTICE '[069] Phase 1: fixed=%, failed=%', v_ok, v_skip;
  END IF;
END;
$$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE SELECT ON TABLES FROM PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE SELECT ON TABLES FROM anon;

DO $$
DECLARE
  v_anon_count int;
  r            RECORD;
BEGIN
  SELECT count(*) INTO v_anon_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p', 'v', 'm')
    AND has_table_privilege('anon', c.oid, 'SELECT');

  IF v_anon_count = 0 THEN
    RAISE NOTICE '[069] pg_graphql_anon_table_exposed (public): CLEARED — 0 anon-accessible objects';
  ELSE
    RAISE WARNING '[069] % public object(s) still anon-accessible:', v_anon_count;
    FOR r IN
      SELECT c.relname, c.relkind
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind IN ('r', 'p', 'v', 'm')
        AND has_table_privilege('anon', c.oid, 'SELECT')
      ORDER BY c.relname
    LOOP
      RAISE WARNING '[069]   still accessible: public.% (relkind=%)', r.relname, r.relkind;
    END LOOP;
  END IF;

  RAISE NOTICE 'Migration 069 complete.';
END;
$$;
;
