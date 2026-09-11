-- Migration 043: Dynamic security_invoker=on for all remaining public views
-- Exemption: v_products_public (intentionally SECURITY DEFINER — migration 040)
DO $$
DECLARE
  r           RECORD;
  v_ok        int := 0;
  v_skip      int := 0;
  v_fail      int := 0;
  v_exempt    text[] := ARRAY['v_products_public'];
BEGIN
  -- Convert fn_get_similar_products to SECURITY INVOKER if it exists (any signature)
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'fn_get_similar_products' AND p.prosecdef = true
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION public.fn_get_similar_products(%s) SECURITY INVOKER', r.args);
      RAISE NOTICE '[043] ✓ fn_get_similar_products(%) → SECURITY INVOKER', r.args;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[043] ✗ Cannot convert fn_get_similar_products(%): %', r.args, SQLERRM;
    END;
  END LOOP;

  -- Convert views to security_invoker=on
  FOR r IN
    SELECT c.relname AS viewname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'v'
      AND NOT (c.relname = ANY(v_exempt))
      AND NOT EXISTS (
        SELECT 1 FROM unnest(c.reloptions) AS opt WHERE opt = 'security_invoker=on'
      )
    ORDER BY c.relname
  LOOP
    BEGIN
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = on)', r.viewname);
      v_ok := v_ok + 1;
    EXCEPTION WHEN OTHERS THEN
      v_fail := v_fail + 1;
      RAISE WARNING '[043] ✗ Could not convert %: %', r.viewname, SQLERRM;
    END;
  END LOOP;
  SELECT count(*) INTO v_skip
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'v'
    AND NOT (c.relname = ANY(v_exempt))
    AND EXISTS (SELECT 1 FROM unnest(c.reloptions) AS opt WHERE opt = 'security_invoker=on');
  RAISE NOTICE '[043] Views: converted=%, already_done=%, failed=%', v_ok, v_skip, v_fail;
END;
$$;;
