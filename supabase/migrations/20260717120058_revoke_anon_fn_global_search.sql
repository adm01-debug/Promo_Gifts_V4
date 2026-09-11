
-- Migration 047: Revoke anon EXECUTE on fn_global_search (dynamic, handles overloads)

DO $$
DECLARE
  r       RECORD;
  v_ok    int := 0;
  v_found boolean := false;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'fn_global_search'
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    v_found := true;
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.fn_global_search(%s) FROM anon', r.args);
      v_ok := v_ok + 1;
      RAISE NOTICE '[047] ✓ REVOKE EXECUTE ON fn_global_search(%) FROM anon', r.args;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[047] ✗ Could not revoke fn_global_search(%): %', r.args, SQLERRM;
    END;
  END LOOP;

  IF NOT v_found THEN
    IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'fn_global_search') THEN
      RAISE NOTICE '[047] - fn_global_search not found — skipping';
    ELSE
      RAISE NOTICE '[047] - fn_global_search already has no anon EXECUTE (idempotent)';
    END IF;
  END IF;

  RAISE NOTICE '[047] revoked=% overloads', v_ok;
END;
$$;

-- Validation
DO $$
DECLARE
  v_fn_oid  oid;
  v_anon_ex boolean;
  v_auth_ex boolean;
  v_secdef  boolean;
  v_def     text;
BEGIN
  SELECT p.oid, p.prosecdef INTO v_fn_oid, v_secdef
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'fn_global_search'
  LIMIT 1;

  IF v_fn_oid IS NULL THEN
    RAISE NOTICE '[047] SKIP: fn_global_search not found — nothing to validate';
    RETURN;
  END IF;

  SELECT has_function_privilege('anon', v_fn_oid, 'EXECUTE') INTO v_anon_ex;
  IF v_anon_ex THEN
    RAISE WARNING '[047] WARN: anon still has EXECUTE on fn_global_search — check overloads';
  ELSE
    RAISE NOTICE '[047] ✓ anon no longer has EXECUTE on fn_global_search';
  END IF;

  BEGIN
    SELECT has_function_privilege('authenticated', v_fn_oid, 'EXECUTE') INTO v_auth_ex;
    IF NOT v_auth_ex THEN
      RAISE WARNING '[047] WARN: authenticated lost EXECUTE on fn_global_search — unexpected';
    ELSE
      RAISE NOTICE '[047] ✓ authenticated retains EXECUTE on fn_global_search';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[047] NOTE: could not check authenticated EXECUTE — %', SQLERRM;
  END;

  IF NOT COALESCE(v_secdef, false) THEN
    RAISE WARNING '[047] WARN: fn_global_search is not SECURITY DEFINER — check function definition';
  ELSE
    RAISE NOTICE '[047] ✓ fn_global_search remains SECURITY DEFINER';
  END IF;

  SELECT pg_get_functiondef(v_fn_oid) INTO v_def;
  IF v_def NOT LIKE '%auth.uid() IS NOT NULL%' THEN
    RAISE WARNING '[047] WARN: migration 042 auth guard may be missing from fn_global_search body';
  ELSE
    RAISE NOTICE '[047] ✓ migration 042 auth guard present in fn_global_search body';
  END IF;

  RAISE NOTICE '[047] Migration 047 complete.';
END;
$$;
;
