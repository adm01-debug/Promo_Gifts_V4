-- Migration 055: Add explicit deny policy to tables with RLS on but zero policies
--
-- Findings addressed: rls_enabled_no_policy (lint 0002)

-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 1: Add explicit deny policy to zero-policy RLS tables
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  r            RECORD;
  v_ok         int := 0;
  v_already    int := 0;
  v_fail       int := 0;
BEGIN
  FOR r IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relrowsecurity = true
      AND NOT EXISTS (
        SELECT 1
        FROM pg_policies p
        WHERE p.schemaname = 'public'
          AND p.tablename = c.relname
      )
    ORDER BY c.relname
  LOOP
    BEGIN
      EXECUTE format(
        $sql$
          CREATE POLICY internal_deny_direct_access
          ON public.%I
          AS RESTRICTIVE
          TO public
          USING (false)
        $sql$,
        r.tablename
      );
      v_ok := v_ok + 1;
      RAISE NOTICE '✓ [055] Added explicit deny policy to % (was RLS-on, 0 policies — intent now explicit)',
        r.tablename;
    EXCEPTION
      WHEN duplicate_object THEN
        v_already := v_already + 1;
        RAISE NOTICE '[055] SKIP %: deny policy already exists', r.tablename;
      WHEN OTHERS THEN
        v_fail := v_fail + 1;
        RAISE WARNING '[055] ✗ Could not add deny policy to %: %', r.tablename, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '[055] Deny-policy sweep: added=%, already_had_policy=%, failed=%',
    v_ok, v_already, v_fail;

  IF v_fail > 0 THEN
    RAISE WARNING '[055] % table(s) could not get a deny policy — check warnings above', v_fail;
  END IF;

  IF v_ok = 0 AND v_already = 0 THEN
    RAISE NOTICE '[055] No zero-policy RLS tables found — rls_enabled_no_policy was already clear';
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 2: Validate
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_remaining int;
  r           RECORD;
BEGIN
  SELECT count(*) INTO v_remaining
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
    AND c.relrowsecurity = true
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = c.relname
    );

  IF v_remaining = 0 THEN
    RAISE NOTICE '✓ [055] All RLS-enabled public tables now have ≥1 policy — rls_enabled_no_policy cleared';
  ELSE
    RAISE WARNING '[055] % public table(s) still have RLS enabled with zero policies — investigate', v_remaining;

    FOR r IN
      SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind IN ('r', 'p')
        AND c.relrowsecurity = true
        AND NOT EXISTS (
          SELECT 1 FROM pg_policies p
          WHERE p.schemaname = 'public' AND p.tablename = c.relname
        )
      ORDER BY c.relname
    LOOP
      RAISE WARNING '[055] Still zero policies: %', r.relname;
    END LOOP;
  END IF;

  DECLARE
    v_deny_count int;
  BEGIN
    SELECT count(*) INTO v_deny_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname = 'internal_deny_direct_access';

    RAISE NOTICE '[055] Tables with explicit internal_deny_direct_access policy: %', v_deny_count;
  END;

  RAISE NOTICE 'Migration 055 complete — rls_enabled_no_policy should clear on next advisor run.';
END;
$$;;
