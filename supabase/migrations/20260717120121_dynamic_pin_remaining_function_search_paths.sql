
-- Migration 048: Dynamically pin search_path on ALL remaining public functions

-- Part 1: Regular functions (prokind = 'f')
DO $$
DECLARE
  r       RECORD;
  v_count int := 0;
  v_fail  int := 0;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) AS cfg WHERE cfg LIKE 'search_path=%')
    ORDER BY p.proname, p.oid
  LOOP
    BEGIN
      EXECUTE format($fmt$ALTER FUNCTION public.%I(%s) SET search_path = 'public', 'extensions'$fmt$, r.proname, r.args);
      v_count := v_count + 1;
      RAISE NOTICE '[048] ✓ pinned search_path: %(%)', r.proname, r.args;
    EXCEPTION WHEN OTHERS THEN
      v_fail := v_fail + 1;
      RAISE WARNING '[048] ✗ could not pin %(%): %', r.proname, r.args, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE '[048] Regular functions: % pinned, % failed', v_count, v_fail;
END;
$$;

-- Part 2: Procedures (prokind = 'p')
DO $$
DECLARE
  r       RECORD;
  v_count int := 0;
  v_fail  int := 0;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'p'
      AND NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) AS cfg WHERE cfg LIKE 'search_path=%')
    ORDER BY p.proname, p.oid
  LOOP
    BEGIN
      EXECUTE format($fmt$ALTER PROCEDURE public.%I(%s) SET search_path = 'public', 'extensions'$fmt$, r.proname, r.args);
      v_count := v_count + 1;
      RAISE NOTICE '[048] ✓ pinned search_path (procedure): %(%)', r.proname, r.args;
    EXCEPTION WHEN OTHERS THEN
      v_fail := v_fail + 1;
      RAISE WARNING '[048] ✗ could not pin procedure %(%): %', r.proname, r.args, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE '[048] Procedures: % pinned, % failed', v_count, v_fail;
END;
$$;

-- Part 3: Aggregate functions (prokind = 'a')
DO $$
DECLARE
  r       RECORD;
  v_count int := 0;
  v_fail  int := 0;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'a'
      AND NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) AS cfg WHERE cfg LIKE 'search_path=%')
    ORDER BY p.proname, p.oid
  LOOP
    BEGIN
      EXECUTE format($fmt$ALTER AGGREGATE public.%I(%s) SET search_path = 'public', 'extensions'$fmt$, r.proname, r.args);
      v_count := v_count + 1;
      RAISE NOTICE '[048] ✓ pinned search_path (aggregate): %(%)', r.proname, r.args;
    EXCEPTION WHEN OTHERS THEN
      v_fail := v_fail + 1;
      RAISE WARNING '[048] ✗ could not pin aggregate %(%): %', r.proname, r.args, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE '[048] Aggregates: % pinned, % failed', v_count, v_fail;
END;
$$;

-- Validation
DO $$
DECLARE
  v_still_mutable int;
  v_total         int;
BEGIN
  SELECT count(*) INTO v_still_mutable
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prokind IN ('f', 'p', 'a')
    AND NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) AS cfg WHERE cfg LIKE 'search_path=%');

  SELECT count(*) INTO v_total
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p', 'a');

  RAISE NOTICE '[048] Total public functions/procedures/aggregates: %', v_total;
  RAISE NOTICE '[048] Still without pinned search_path: %', v_still_mutable;

  IF v_still_mutable = 0 THEN
    RAISE NOTICE '[048] ✓ ALL public functions have pinned search_path — function_search_path_mutable cleared';
  ELSIF v_still_mutable <= 5 THEN
    RAISE NOTICE '[048] % function(s) could not be pinned (likely C-language or extension functions)', v_still_mutable;
  ELSE
    RAISE WARNING '[048] % function(s) still have mutable search_path — investigate', v_still_mutable;
  END IF;

  RAISE NOTICE '[048] Migration 048 complete.';
END;
$$;
;
