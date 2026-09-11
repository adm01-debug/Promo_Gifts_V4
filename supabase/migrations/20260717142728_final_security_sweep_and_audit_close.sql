-- Migration 071: Final security sweep — close 200-commit audit

-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 1: Final anon sweep — revoke any newly granted anon SELECT
-- ═══════════════════════════════════════════════════════════════════════════════

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
      RAISE WARNING '[071] Phase 1: Found anon-accessible public.% (relkind=%) — fixed',
        r.relname, r.relkind;
    EXCEPTION WHEN OTHERS THEN
      v_skip := v_skip + 1;
      RAISE WARNING '[071] Phase 1: Failed on public.%: %', r.relname, SQLERRM;
    END;
  END LOOP;

  IF v_ok = 0 AND v_skip = 0 THEN
    RAISE NOTICE '[071] Phase 1: CLEAN — no anon-accessible public objects found';
  ELSE
    RAISE NOTICE '[071] Phase 1: swept=%, failed=%', v_ok, v_skip;
  END IF;
END;
$$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE SELECT ON TABLES FROM PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE SELECT ON TABLES FROM anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 2: Enable RLS on any public BASE TABLE missing it
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  r    RECORD;
  v_ok int := 0;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND NOT c.relrowsecurity
    ORDER BY c.relname
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
      v_ok := v_ok + 1;
      RAISE WARNING '[071] Phase 2: Enabled RLS on public.% (was missing)', r.relname;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[071] Phase 2: Could not enable RLS on public.%: %', r.relname, SQLERRM;
    END;
  END LOOP;

  IF v_ok = 0 THEN
    RAISE NOTICE '[071] Phase 2: CLEAN — all public tables already have RLS enabled';
  ELSE
    RAISE NOTICE '[071] Phase 2: Enabled RLS on % table(s)', v_ok;
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 3: Final validation report
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_anon_count      int;
  v_no_rls_count    int;
  v_unindexed_fk    int;
  v_public_mv_count int;
BEGIN
  SELECT count(*) INTO v_anon_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p', 'v', 'm')
    AND has_table_privilege('anon', c.oid, 'SELECT');

  SELECT count(*) INTO v_no_rls_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
    AND NOT c.relrowsecurity;

  SELECT count(DISTINCT (c.conrelid, c.conkey[1]))
  INTO v_unindexed_fk
  FROM pg_constraint c
  JOIN pg_namespace n ON n.oid = (SELECT relnamespace FROM pg_class WHERE oid = c.conrelid)
  WHERE c.contype = 'f'
    AND n.nspname = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM pg_index pi
      JOIN pg_attribute pa ON pa.attrelid = pi.indrelid AND pa.attnum = pi.indkey[0]
      WHERE pi.indrelid = c.conrelid AND pa.attnum = c.conkey[1]
    );

  SELECT count(*) INTO v_public_mv_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'm';

  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '[071] 200-commit audit — FINAL STATE REPORT';
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '[071] pg_graphql_anon_table_exposed     : % (target: 0)', v_anon_count;
  RAISE NOTICE '[071] auth_rls_disabled_in_public       : % (target: 0)', v_no_rls_count;
  RAISE NOTICE '[071] unindexed_foreign_keys            : % (target: 0)', v_unindexed_fk;
  RAISE NOTICE '[071] materialized_view_in_api (public) : % (target: 0)', v_public_mv_count;

  IF v_anon_count = 0
     AND v_no_rls_count = 0
     AND v_unindexed_fk = 0
     AND v_public_mv_count = 0
  THEN
    RAISE NOTICE '[071] ALL AUTOMATED TARGETS CLEARED ✓';
  ELSE
    RAISE WARNING '[071] Some targets not met — review above';
  END IF;

  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE 'Migration 071 complete — 200-commit audit CLOSED.';
END;
$$;;
