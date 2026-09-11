-- Migration 051: Consolidate multiple permissive RLS policies per (table, cmd, roles)
--
-- Source: 200-commit audit — Supabase security/performance advisor finding
-- Findings addressed: multiple_permissive_policies (lint 0004)

-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 1: Consolidate duplicate permissive policies
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  r            RECORD;
  pol          RECORD;
  v_ok         int := 0;
  v_skip       int := 0;
  v_fail       int := 0;

  v_combined_qual   text;
  v_combined_check  text;
  v_has_null_qual   boolean;
  v_has_null_check  boolean;
  v_first_pname     text;
  v_combined_name   text;
  v_role_label      text;
  v_sql             text;

  v_policy_names    text[];
  v_pname           text;
BEGIN
  FOR r IN
    SELECT
      p.tablename,
      p.cmd,
      p.roles::text          AS roles_key,
      p.roles[1]             AS sole_role,
      array_length(p.roles, 1) AS roles_count,
      count(*)               AS policy_count
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.permissive = 'PERMISSIVE'
    GROUP BY p.tablename, p.cmd, p.roles::text, p.roles[1], array_length(p.roles, 1)
    HAVING count(*) > 1
    ORDER BY p.tablename, p.cmd, p.roles::text
  LOOP
    IF r.roles_count > 1 THEN
      v_skip := v_skip + 1;
      RAISE NOTICE '[051] SKIP %.% roles=% — multi-role policy (roles_count=%); merge manually',
        r.tablename, r.cmd, r.roles_key, r.roles_count;
      CONTINUE;
    END IF;

    v_policy_names  := ARRAY[]::text[];
    v_combined_qual := NULL;
    v_combined_check := NULL;
    v_has_null_qual  := false;
    v_has_null_check := false;
    v_first_pname   := NULL;

    FOR pol IN
      SELECT p.policyname, p.qual, p.with_check
      FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename  = r.tablename
        AND p.cmd        = r.cmd
        AND p.roles::text = r.roles_key
        AND p.permissive = 'PERMISSIVE'
      ORDER BY p.policyname
    LOOP
      v_policy_names := array_append(v_policy_names, pol.policyname);

      IF v_first_pname IS NULL THEN
        v_first_pname := pol.policyname;
      END IF;

      IF pol.qual IS NULL THEN
        v_has_null_qual := true;
      ELSE
        IF NOT v_has_null_qual THEN
          IF v_combined_qual IS NULL THEN
            v_combined_qual := '(' || pol.qual || ')';
          ELSE
            v_combined_qual := v_combined_qual || ' OR (' || pol.qual || ')';
          END IF;
        END IF;
      END IF;

      IF pol.with_check IS NULL THEN
        v_has_null_check := true;
      ELSE
        IF NOT v_has_null_check THEN
          IF v_combined_check IS NULL THEN
            v_combined_check := '(' || pol.with_check || ')';
          ELSE
            v_combined_check := v_combined_check || ' OR (' || pol.with_check || ')';
          END IF;
        END IF;
      END IF;
    END LOOP;

    IF v_has_null_qual  THEN v_combined_qual  := NULL; END IF;
    IF v_has_null_check THEN v_combined_check := NULL; END IF;

    v_role_label := CASE
      WHEN r.roles_key = '{}'  THEN 'public'
      WHEN r.sole_role IS NOT NULL THEN r.sole_role
      ELSE 'multi'
    END;
    v_combined_name := 'consolidated_' || lower(r.cmd) || '_' || v_role_label;
    IF length(v_combined_name) > 63 THEN
      v_combined_name := left(v_combined_name, 63);
    END IF;

    BEGIN
      FOREACH v_pname IN ARRAY v_policy_names
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_pname, r.tablename);
      END LOOP;

      v_sql := format(
        'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR %s',
        v_combined_name, r.tablename, r.cmd
      );

      IF r.roles_key = '{}' THEN
        v_sql := v_sql || ' TO public';
      ELSE
        v_sql := v_sql || format(' TO %I', r.sole_role);
      END IF;

      IF v_combined_qual IS NOT NULL THEN
        v_sql := v_sql || ' USING (' || v_combined_qual || ')';
      END IF;

      IF v_combined_check IS NOT NULL THEN
        v_sql := v_sql || ' WITH CHECK (' || v_combined_check || ')';
      END IF;

      EXECUTE v_sql;

      v_ok := v_ok + 1;
      RAISE NOTICE '✓ [051] Consolidated % policies → "%": table=%, cmd=%, roles=%',
        array_length(v_policy_names, 1), v_combined_name, r.tablename, r.cmd, r.roles_key;

    EXCEPTION WHEN OTHERS THEN
      v_fail := v_fail + 1;
      RAISE WARNING '[051] ✗ Could not consolidate %.% roles=%: %',
        r.tablename, r.cmd, r.roles_key, SQLERRM;
      RAISE WARNING '[051] ✗ IMPORTANT: Dropped policies for %.% roles=% may need manual restore: %',
        r.tablename, r.cmd, r.roles_key,
        array_to_string(v_policy_names, ', ');
    END;
  END LOOP;

  RAISE NOTICE '[051] Policy consolidation: merged=%, skipped=%, failed=%',
    v_ok, v_skip, v_fail;

  IF v_fail > 0 THEN
    RAISE WARNING '[051] % group(s) failed — check warnings above', v_fail;
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 2: Spot-check known tables
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_tbl     text;
  v_cnt     int;
  v_tables  text[] := ARRAY[
    'products',
    'product_variants',
    'suppliers',
    'orders',
    'quotes',
    'organizations',
    'users',
    'notifications',
    'saved_filters',
    'entity_versions'
  ];
BEGIN
  FOREACH v_tbl IN ARRAY v_tables
  LOOP
    SELECT count(*) INTO v_cnt
    FROM (
      SELECT cmd, roles::text, count(*)
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = v_tbl
        AND permissive = 'PERMISSIVE'
      GROUP BY cmd, roles::text
      HAVING count(*) > 1
    ) sub;

    IF v_cnt = 0 THEN
      RAISE NOTICE '✓ [051] % — no remaining duplicate permissive policies', v_tbl;
    ELSE
      RAISE WARNING '[051] % — still has % group(s) with multiple permissive policies', v_tbl, v_cnt;
    END IF;
  END LOOP;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Validation
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_remaining int;
  r           RECORD;
BEGIN
  SELECT count(*) INTO v_remaining
  FROM (
    SELECT tablename, cmd, roles::text
    FROM pg_policies
    WHERE schemaname = 'public'
      AND permissive = 'PERMISSIVE'
    GROUP BY tablename, cmd, roles::text
    HAVING count(*) > 1
  ) sub;

  IF v_remaining = 0 THEN
    RAISE NOTICE '✓ [051] No remaining (table, cmd, roles) groups with multiple permissive policies — multiple_permissive_policies cleared';
  ELSE
    RAISE WARNING '[051] % group(s) still have multiple permissive policies — investigate', v_remaining;

    FOR r IN
      SELECT tablename, cmd, roles::text AS roles_key, count(*) AS cnt
      FROM pg_policies
      WHERE schemaname = 'public'
        AND permissive = 'PERMISSIVE'
      GROUP BY tablename, cmd, roles::text
      HAVING count(*) > 1
      ORDER BY tablename, cmd
    LOOP
      RAISE WARNING '[051] Still multiple: table=% cmd=% roles=% count=%',
        r.tablename, r.cmd, r.roles_key, r.cnt;
    END LOOP;
  END IF;

  RAISE NOTICE 'Migration 051 complete — multiple_permissive_policies should clear on next advisor run.';
END;
$$;;
