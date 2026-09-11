-- Migration 040: Fix materialized_view_in_api + anon SECURITY DEFINER functions
--
-- Source: 200-commit audit + security advisor findings
-- Findings addressed: 3
--   1) materialized_view_in_api — public.mv_product_leaf_category
--   2) anon_security_definer_function_executable — public.fn_rpc_exists
--   3) anon_security_definer_function_executable — public.fn_get_product_intelligence_all

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1) Fix materialized_view_in_api: convert v_products_public to SECURITY DEFINER
--    then revoke direct MV access from API roles
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'v_products_public' AND c.relkind = 'v'
  ) THEN
    ALTER VIEW public.v_products_public SET (security_invoker = false);
    RAISE NOTICE '✓ [materialized_view_in_api] v_products_public converted to SECURITY DEFINER';
  ELSE
    RAISE NOTICE '- v_products_public not found — skipping view alter';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'mv_product_leaf_category' AND c.relkind = 'm'
  ) THEN
    REVOKE SELECT ON public.mv_product_leaf_category FROM anon, authenticated;
    RAISE NOTICE '✓ [materialized_view_in_api] REVOKE SELECT ON mv_product_leaf_category FROM anon, authenticated';
  ELSE
    RAISE NOTICE '- public.mv_product_leaf_category not found — skipping revoke';
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2) Revoke anon execute on fn_rpc_exists (schema introspection)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'fn_rpc_exists'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.fn_rpc_exists(text) FROM anon;
    RAISE NOTICE '✓ [anon_security_definer_function_executable] REVOKE EXECUTE ON fn_rpc_exists FROM anon';
  ELSE
    RAISE NOTICE '- public.fn_rpc_exists not found — skipping';
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3) Revoke anon execute on fn_get_product_intelligence_all (internal inventory metrics)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'fn_get_product_intelligence_all'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.fn_get_product_intelligence_all() FROM anon;
    RAISE NOTICE '✓ [anon_security_definer_function_executable] REVOKE EXECUTE ON fn_get_product_intelligence_all FROM anon';
  ELSE
    RAISE NOTICE '- public.fn_get_product_intelligence_all not found — skipping';
  END IF;
END;
$$;

-- ─── Validation ───────────────────────────────────────────────────────────────
DO $$
DECLARE
  view_invoker    text;
  anon_mv_select  boolean;
  anon_rpc        boolean;
  anon_intel      boolean;
BEGIN
  SELECT opt INTO view_invoker
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL unnest(c.reloptions) AS opt
  WHERE n.nspname = 'public' AND c.relname = 'v_products_public' AND c.relkind = 'v'
    AND opt LIKE 'security_invoker%';

  IF view_invoker IS NULL OR view_invoker = 'security_invoker=on' THEN
    RAISE WARNING 'v_products_public may still be SECURITY INVOKER: %', view_invoker;
  ELSE
    RAISE NOTICE '✓ v_products_public security setting: %', view_invoker;
  END IF;

  SELECT has_table_privilege('anon', 'public.mv_product_leaf_category', 'SELECT')
  INTO anon_mv_select;

  IF anon_mv_select THEN
    RAISE WARNING 'anon still has SELECT on mv_product_leaf_category';
  ELSE
    RAISE NOTICE '✓ anon no longer has SELECT on mv_product_leaf_category';
  END IF;

  SELECT has_function_privilege('anon', 'public.fn_rpc_exists(text)', 'EXECUTE')
  INTO anon_rpc;

  IF anon_rpc THEN
    RAISE WARNING 'anon still has EXECUTE on fn_rpc_exists';
  ELSE
    RAISE NOTICE '✓ anon no longer has EXECUTE on fn_rpc_exists';
  END IF;

  SELECT has_function_privilege('anon', 'public.fn_get_product_intelligence_all()', 'EXECUTE')
  INTO anon_intel;

  IF anon_intel THEN
    RAISE WARNING 'anon still has EXECUTE on fn_get_product_intelligence_all';
  ELSE
    RAISE NOTICE '✓ anon no longer has EXECUTE on fn_get_product_intelligence_all';
  END IF;

  RAISE NOTICE 'Migration 040 complete — 3 security findings addressed.';
END;
$$;;
