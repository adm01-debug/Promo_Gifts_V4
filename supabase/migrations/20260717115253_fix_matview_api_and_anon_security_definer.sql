-- Migration 040: Fix materialized_view_in_api + anon SECURITY DEFINER functions

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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'fn_rpc_exists'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.fn_rpc_exists(text) FROM anon;
    RAISE NOTICE '✓ REVOKE EXECUTE ON fn_rpc_exists FROM anon';
  ELSE
    RAISE NOTICE '- public.fn_rpc_exists not found — skipping';
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'fn_get_product_intelligence_all'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.fn_get_product_intelligence_all() FROM anon;
    RAISE NOTICE '✓ REVOKE EXECUTE ON fn_get_product_intelligence_all FROM anon';
  ELSE
    RAISE NOTICE '- public.fn_get_product_intelligence_all not found — skipping';
  END IF;
END;
$$;;
