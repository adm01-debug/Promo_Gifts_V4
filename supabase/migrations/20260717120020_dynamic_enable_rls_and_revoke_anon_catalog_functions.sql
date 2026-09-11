
-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 046a: Enable RLS on all remaining public tables
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  r              RECORD;
  v_ok           int := 0;
  v_no_policy    int := 0;
  v_fail         int := 0;
BEGIN
  FOR r IN
    SELECT
      c.relname    AS tablename,
      c.relkind,
      (SELECT count(*)::int FROM pg_policies p
       WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS policy_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND NOT c.relrowsecurity
    ORDER BY c.relname
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
      v_ok := v_ok + 1;
      IF r.policy_count = 0 THEN
        v_no_policy := v_no_policy + 1;
        RAISE WARNING '[046] % — RLS ENABLED, but NO policies (service_role bypasses via BYPASSRLS)', r.tablename;
      ELSE
        RAISE NOTICE '✓ [046] Enabled RLS on % (% existing policies now active)', r.tablename, r.policy_count;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_fail := v_fail + 1;
      RAISE WARNING '[046] ✗ Could not enable RLS on %: %', r.tablename, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '[046] RLS enable sweep: enabled=%, of_which_no_policy=%, failed=%', v_ok, v_no_policy, v_fail;

  IF v_no_policy > 0 THEN
    RAISE WARNING '[046] % table(s) now have RLS enabled with ZERO policies — review and add appropriate policies', v_no_policy;
  END IF;

  IF v_fail > 0 THEN
    RAISE WARNING '[046] % table(s) could not have RLS enabled', v_fail;
  END IF;
END;
$$;

-- Target-check known tables
DO $$
DECLARE
  v_tbl     text;
  v_has_rls boolean;
  v_tables  text[] := ARRAY[
    'products', 'product_variants', 'suppliers', 'supplier_products_raw',
    'categories', 'users', 'organizations', 'orders', 'quotes',
    'notifications', 'saved_filters', 'entity_versions', 'ai_insights_cache',
    'workspace_notifications', 'discount_approval_requests', 'product_badge_definitions'
  ];
BEGIN
  FOREACH v_tbl IN ARRAY v_tables LOOP
    SELECT c.relrowsecurity INTO v_has_rls
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = v_tbl;

    IF NOT FOUND THEN
      RAISE NOTICE '[046] % — not found in public schema', v_tbl;
    ELSIF v_has_rls THEN
      RAISE NOTICE '✓ [046] % — RLS confirmed enabled', v_tbl;
    ELSE
      RAISE WARNING '[046] % — RLS STILL DISABLED after sweep — investigate', v_tbl;
    END IF;
  END LOOP;
END;
$$;

-- Validation
DO $$
DECLARE
  v_total_tables int;
  v_rls_enabled  int;
  v_rls_disabled int;
  r              RECORD;
BEGIN
  SELECT count(*) INTO v_total_tables FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p');

  SELECT count(*) INTO v_rls_enabled FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relrowsecurity;

  v_rls_disabled := v_total_tables - v_rls_enabled;

  IF v_rls_disabled = 0 THEN
    RAISE NOTICE '✓ [046] All % public tables have RLS enabled — rls_disabled_in_public cleared', v_total_tables;
  ELSE
    FOR r IN
      SELECT c.relname FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
      ORDER BY c.relname
    LOOP
      RAISE WARNING '[046] Still disabled: %', r.relname;
    END LOOP;
    RAISE WARNING '[046] % of % public tables still have RLS disabled', v_rls_disabled, v_total_tables;
  END IF;

  RAISE NOTICE 'Migration 046a complete.';
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 046b: Revoke anon EXECUTE on 9 remaining catalog SECURITY DEFINER functions
-- Uses dynamic OID-based revoke to handle overloaded functions
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  r         RECORD;
  v_ok      int := 0;
  v_skip    int := 0;
  v_fail    int := 0;
  v_targets text[] := ARRAY[
    'fn_super_filtro',
    'fn_super_filtro_facets',
    'fn_super_filtro_opcoes',
    'fn_super_filtro_price_range',
    'fn_super_filtro_product_ids',
    'fn_get_all_leaf_categories',
    'fn_get_color_swatches_batch',
    'fn_get_product_customization_options',
    'fn_get_customization_price'
  ];
  v_name    text;
  v_found   boolean;
BEGIN
  FOREACH v_name IN ARRAY v_targets LOOP
    v_found := false;
    FOR r IN
      SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = v_name
        AND has_function_privilege('anon', p.oid, 'EXECUTE')
    LOOP
      v_found := true;
      BEGIN
        EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon', r.proname, r.args);
        v_ok := v_ok + 1;
        RAISE NOTICE '[046] ✓ REVOKE EXECUTE ON %(%) FROM anon', r.proname, r.args;
      EXCEPTION WHEN OTHERS THEN
        v_fail := v_fail + 1;
        RAISE WARNING '[046] ✗ Could not revoke %(%)): %', r.proname, r.args, SQLERRM;
      END;
    END LOOP;

    IF NOT v_found THEN
      v_skip := v_skip + 1;
      IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = v_name) THEN
        RAISE NOTICE '[046] - % not found in database', v_name;
      ELSE
        RAISE NOTICE '[046] - % already has no anon EXECUTE', v_name;
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE '[046] Catalog SECDEF revoke: revoked=%, skipped=%, failed=%', v_ok, v_skip, v_fail;
END;
$$;

-- Validate 046b — verify critical SECURITY DEFINER functions retained their mode
DO $$
DECLARE
  v_secdef boolean;
  v_name   text;
BEGIN
  FOREACH v_name IN ARRAY ARRAY['fn_get_product_customization_options', 'fn_get_customization_price'] LOOP
    SELECT p.prosecdef INTO v_secdef FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = v_name LIMIT 1;

    IF NOT FOUND THEN
      RAISE NOTICE '[046] % not found — skip SECDEF check', v_name;
    ELSIF NOT COALESCE(v_secdef, false) THEN
      RAISE EXCEPTION '[046] CRITICAL: % lost SECURITY DEFINER — engraving would break', v_name;
    ELSE
      RAISE NOTICE '[046] ✓ % remains SECURITY DEFINER (invariant preserved)', v_name;
    END IF;
  END LOOP;

  RAISE NOTICE '[046] Migration 046b complete — 046a+046b applied successfully.';
END;
$$;
;
