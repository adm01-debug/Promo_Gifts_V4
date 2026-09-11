
-- Migration 049: Revoke anon EXECUTE on 3 remaining SECURITY DEFINER functions

DO $$
DECLARE
  v_ok   int := 0;
  v_fail int := 0;
BEGIN
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.get_profile_and_roles(uuid) FROM anon;
    v_ok := v_ok + 1;
    RAISE NOTICE '✓ [049] REVOKE EXECUTE ON get_profile_and_roles(uuid) FROM anon';
  EXCEPTION
    WHEN undefined_function THEN RAISE NOTICE '- [049] get_profile_and_roles(uuid) not found — skipping';
    WHEN OTHERS THEN v_fail := v_fail + 1; RAISE WARNING '[049] ✗ Could not revoke get_profile_and_roles(uuid): %', SQLERRM;
  END;

  BEGIN
    REVOKE EXECUTE ON FUNCTION public.get_favorite_list_counts(uuid) FROM anon;
    v_ok := v_ok + 1;
    RAISE NOTICE '✓ [049] REVOKE EXECUTE ON get_favorite_list_counts(uuid) FROM anon';
  EXCEPTION
    WHEN undefined_function THEN RAISE NOTICE '- [049] get_favorite_list_counts(uuid) not found — skipping';
    WHEN OTHERS THEN v_fail := v_fail + 1; RAISE WARNING '[049] ✗ Could not revoke get_favorite_list_counts(uuid): %', SQLERRM;
  END;

  BEGIN
    REVOKE EXECUTE ON FUNCTION public.get_public_schema_signatures() FROM anon;
    v_ok := v_ok + 1;
    RAISE NOTICE '✓ [049] REVOKE EXECUTE ON get_public_schema_signatures() FROM anon';
  EXCEPTION
    WHEN undefined_function THEN RAISE NOTICE '- [049] get_public_schema_signatures() not found — skipping';
    WHEN OTHERS THEN v_fail := v_fail + 1; RAISE WARNING '[049] ✗ Could not revoke get_public_schema_signatures(): %', SQLERRM;
  END;

  RAISE NOTICE '[049] Summary: revoked=%, failed=%', v_ok, v_fail;
  IF v_fail > 0 THEN RAISE WARNING '[049] % revocation(s) failed', v_fail; END IF;
END;
$$;

-- Validation
DO $$
DECLARE
  v_remaining int;
  r           RECORD;
  v_targets   text[] := ARRAY['get_profile_and_roles', 'get_favorite_list_counts', 'get_public_schema_signatures'];
BEGIN
  SELECT count(*) INTO v_remaining
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = ANY(v_targets)
    AND p.prosecdef = true
    AND has_function_privilege('anon', p.oid, 'EXECUTE');

  IF v_remaining = 0 THEN
    RAISE NOTICE '✓ [049] All target functions: anon EXECUTE revoked';
  ELSE
    FOR r IN
      SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = ANY(v_targets)
        AND p.prosecdef = true AND has_function_privilege('anon', p.oid, 'EXECUTE')
    LOOP
      RAISE WARNING '[049] Still callable by anon: %(%)', r.proname, r.args;
    END LOOP;
  END IF;

  SELECT count(*) INTO v_remaining
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prosecdef = true
    AND has_function_privilege('anon', p.oid, 'EXECUTE');

  RAISE NOTICE '[049] Total remaining public SECURITY DEFINER functions callable by anon: %', v_remaining;

  IF v_remaining <= 5 THEN
    RAISE NOTICE '✓ [049] ≤5 remaining — only legitimate auth-flow functions expected';
  ELSE
    RAISE WARNING '[049] % public SECURITY DEFINER functions still callable by anon — investigate', v_remaining;
  END IF;

  RAISE NOTICE '[049] Migration 049 complete.';
END;
$$;
;
