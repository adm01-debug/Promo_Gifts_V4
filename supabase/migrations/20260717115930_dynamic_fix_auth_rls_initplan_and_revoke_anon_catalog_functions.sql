
-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 045a: Dynamic auth_rls_initplan fix — ALL remaining public policies
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  r          RECORD;
  v_ok       int := 0;
  v_skip     int := 0;
  v_fail     int := 0;
  v_qual     text;
  v_check    text;
  c_ph       CONSTANT text := '<<AUTH_UID_ALREADY_WRAPPED>>';
BEGIN
  FOR r IN
    SELECT
      p.policyname,
      p.tablename,
      p.cmd,
      p.qual,
      p.with_check
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND (
        (p.qual       IS NOT NULL
          AND p.qual       LIKE '%auth.uid()%'
          AND p.qual       NOT LIKE '%(SELECT auth.uid())%')
        OR
        (p.with_check IS NOT NULL
          AND p.with_check LIKE '%auth.uid()%'
          AND p.with_check NOT LIKE '%(SELECT auth.uid())%')
      )
    ORDER BY p.tablename, p.policyname
  LOOP
    v_qual  := replace(r.qual,       '(SELECT auth.uid())', c_ph);
    v_check := replace(r.with_check, '(SELECT auth.uid())', c_ph);
    v_qual  := replace(v_qual,  'auth.uid()', '(SELECT auth.uid())');
    v_check := replace(v_check, 'auth.uid()', '(SELECT auth.uid())');
    v_qual  := replace(v_qual,  c_ph, '(SELECT auth.uid())');
    v_check := replace(v_check, c_ph, '(SELECT auth.uid())');

    BEGIN
      IF r.qual IS NOT NULL AND r.with_check IS NOT NULL THEN
        EXECUTE format(
          'ALTER POLICY %I ON public.%I USING (%s) WITH CHECK (%s)',
          r.policyname, r.tablename, v_qual, v_check
        );
      ELSIF r.qual IS NOT NULL THEN
        EXECUTE format(
          'ALTER POLICY %I ON public.%I USING (%s)',
          r.policyname, r.tablename, v_qual
        );
      ELSIF r.with_check IS NOT NULL THEN
        EXECUTE format(
          'ALTER POLICY %I ON public.%I WITH CHECK (%s)',
          r.policyname, r.tablename, v_check
        );
      ELSE
        v_skip := v_skip + 1;
        CONTINUE;
      END IF;

      v_ok := v_ok + 1;
      RAISE NOTICE '✓ [045] Optimized %.% (%)', r.tablename, r.policyname, r.cmd;
    EXCEPTION WHEN OTHERS THEN
      v_fail := v_fail + 1;
      RAISE WARNING '[045] ✗ Could not optimize %.% (%): %',
        r.tablename, r.policyname, r.cmd, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '[045] auth_rls_initplan sweep: optimized=%, skipped=%, failed=%',
    v_ok, v_skip, v_fail;

  IF v_fail > 0 THEN
    RAISE WARNING '[045] % policy/policies could not be optimized — check warnings above', v_fail;
  END IF;
END;
$$;

-- Phase 2: target spot-checks
DO $$
DECLARE
  v_tbl        text;
  v_bare_count int;
  v_tables     text[] := ARRAY[
    'entity_versions', 'saved_filters', 'product_badge_definitions',
    'discount_approval_requests', 'workspace_notifications', 'ai_insights_cache',
    'notifications', 'user_organizations', 'quotes', 'orders'
  ];
BEGIN
  FOREACH v_tbl IN ARRAY v_tables
  LOOP
    SELECT count(*) INTO v_bare_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = v_tbl
      AND (
        (qual       LIKE '%auth.uid()%' AND qual       NOT LIKE '%(SELECT auth.uid())%')
        OR
        (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
      );

    IF v_bare_count = 0 THEN
      RAISE NOTICE '✓ [045] % — no remaining bare auth.uid() policies', v_tbl;
    ELSE
      RAISE WARNING '[045] % still has % bare auth.uid() policy/policies', v_tbl, v_bare_count;
    END IF;
  END LOOP;
END;
$$;

-- Validation
DO $$
DECLARE
  v_total_policies  int;
  v_bare_remaining  int;
BEGIN
  SELECT count(*) INTO v_total_policies FROM pg_policies WHERE schemaname = 'public';
  SELECT count(*) INTO v_bare_remaining
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (
      (qual       LIKE '%auth.uid()%' AND qual       NOT LIKE '%(SELECT auth.uid())%')
      OR
      (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
    );

  IF v_bare_remaining = 0 THEN
    RAISE NOTICE '✓ [045] All % public policies use (SELECT auth.uid()) — auth_rls_initplan cleared', v_total_policies;
  ELSE
    RAISE WARNING '[045] % of % public policies still have bare auth.uid()', v_bare_remaining, v_total_policies;
  END IF;
  RAISE NOTICE 'Migration 045a complete.';
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 045b: Revoke anon EXECUTE on 4 authenticated-only catalog RPCs
-- Dynamic: uses pg_proc OIDs + pg_get_function_identity_arguments to handle overloads
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  r            RECORD;
  v_ok         int := 0;
  v_skip       int := 0;
  v_fail       int := 0;
  v_targets    text[] := ARRAY[
    'get_catalog_bestseller_page',
    'get_promo_sales_ranking',
    'get_top_collected_products',
    'get_collections_weekly_count'
  ];
  v_name       text;
BEGIN
  FOREACH v_name IN ARRAY v_targets LOOP
    FOR r IN
      SELECT
        p.oid,
        p.proname,
        pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = v_name
        AND has_function_privilege('anon', p.oid, 'EXECUTE')
    LOOP
      BEGIN
        EXECUTE format(
          'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon',
          r.proname, r.args
        );
        v_ok := v_ok + 1;
        RAISE NOTICE '[045] ✓ REVOKE EXECUTE ON %(%) FROM anon', r.proname, r.args;
      EXCEPTION WHEN OTHERS THEN
        v_fail := v_fail + 1;
        RAISE WARNING '[045] ✗ Could not revoke %(%)): %', r.proname, r.args, SQLERRM;
      END;
    END LOOP;

    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = v_name
    ) THEN
      v_skip := v_skip + 1;
      RAISE NOTICE '[045] - % not found in database — skipping', v_name;
    END IF;
  END LOOP;

  RAISE NOTICE '[045] Catalog function revoke: revoked=%, skipped=%, failed=%',
    v_ok, v_skip, v_fail;

  IF v_fail > 0 THEN
    RAISE WARNING '[045] % revocation(s) failed', v_fail;
  END IF;
END;
$$;

-- Validate 045b
DO $$
DECLARE
  v_name         text;
  v_anon_ex      boolean;
  v_targets      text[] := ARRAY[
    'get_catalog_bestseller_page', 'get_promo_sales_ranking',
    'get_top_collected_products', 'get_collections_weekly_count'
  ];
  v_still_granted int := 0;
BEGIN
  FOREACH v_name IN ARRAY v_targets LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = v_name) THEN
      RAISE NOTICE '[045] SKIP: % not found', v_name;
      CONTINUE;
    END IF;

    SELECT has_function_privilege('anon',
      (SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = v_name LIMIT 1),
      'EXECUTE') INTO v_anon_ex;

    IF v_anon_ex THEN
      RAISE WARNING '[045] WARN: anon still has EXECUTE on % (may have multiple overloads)', v_name;
      v_still_granted := v_still_granted + 1;
    ELSE
      RAISE NOTICE '[045] OK: anon no longer has EXECUTE on %', v_name;
    END IF;
  END LOOP;

  IF v_still_granted > 0 THEN
    RAISE WARNING '[045] % function(s) still grant EXECUTE to anon — check overloads', v_still_granted;
  END IF;

  RAISE NOTICE '[045] Migration 045b complete — 045a+045b applied successfully.';
END;
$$;
;
