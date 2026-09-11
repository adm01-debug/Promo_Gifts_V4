
-- Migration 050: Dynamic auth_rls_initplan fix — auth.role(), auth.email(), auth.jwt()

-- Pass 1: Fix bare auth.role()
DO $$
DECLARE
  r       RECORD;
  v_ok    int := 0;
  v_skip  int := 0;
  v_fail  int := 0;
  v_qual  text;
  v_check text;
  c_ph    CONSTANT text := '<<AUTH_ROLE_ALREADY_WRAPPED>>';
BEGIN
  FOR r IN
    SELECT p.policyname, p.tablename, p.cmd, p.qual, p.with_check
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND (
        (p.qual IS NOT NULL AND p.qual LIKE '%auth.role()%' AND p.qual NOT LIKE '%(SELECT auth.role())%')
        OR (p.with_check IS NOT NULL AND p.with_check LIKE '%auth.role()%' AND p.with_check NOT LIKE '%(SELECT auth.role())%')
      )
    ORDER BY p.tablename, p.policyname
  LOOP
    v_qual  := replace(replace(replace(r.qual,       '(SELECT auth.role())', c_ph), 'auth.role()', '(SELECT auth.role())'), c_ph, '(SELECT auth.role())');
    v_check := replace(replace(replace(r.with_check, '(SELECT auth.role())', c_ph), 'auth.role()', '(SELECT auth.role())'), c_ph, '(SELECT auth.role())');
    BEGIN
      IF r.qual IS NOT NULL AND r.with_check IS NOT NULL THEN
        EXECUTE format('ALTER POLICY %I ON public.%I USING (%s) WITH CHECK (%s)', r.policyname, r.tablename, v_qual, v_check);
      ELSIF r.qual IS NOT NULL THEN
        EXECUTE format('ALTER POLICY %I ON public.%I USING (%s)', r.policyname, r.tablename, v_qual);
      ELSIF r.with_check IS NOT NULL THEN
        EXECUTE format('ALTER POLICY %I ON public.%I WITH CHECK (%s)', r.policyname, r.tablename, v_check);
      ELSE v_skip := v_skip + 1; CONTINUE;
      END IF;
      v_ok := v_ok + 1;
      RAISE NOTICE '✓ [050] auth.role() wrapped: %.% (%)', r.tablename, r.policyname, r.cmd;
    EXCEPTION WHEN OTHERS THEN
      v_fail := v_fail + 1;
      RAISE WARNING '[050] ✗ auth.role() %.% (%): %', r.tablename, r.policyname, r.cmd, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE '[050] Pass 1 auth.role(): optimized=%, skipped=%, failed=%', v_ok, v_skip, v_fail;
END;
$$;

-- Pass 2: Fix bare auth.email()
DO $$
DECLARE
  r       RECORD;
  v_ok    int := 0;
  v_skip  int := 0;
  v_fail  int := 0;
  v_qual  text;
  v_check text;
  c_ph    CONSTANT text := '<<AUTH_EMAIL_ALREADY_WRAPPED>>';
BEGIN
  FOR r IN
    SELECT p.policyname, p.tablename, p.cmd, p.qual, p.with_check
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND (
        (p.qual IS NOT NULL AND p.qual LIKE '%auth.email()%' AND p.qual NOT LIKE '%(SELECT auth.email())%')
        OR (p.with_check IS NOT NULL AND p.with_check LIKE '%auth.email()%' AND p.with_check NOT LIKE '%(SELECT auth.email())%')
      )
    ORDER BY p.tablename, p.policyname
  LOOP
    v_qual  := replace(replace(replace(r.qual,       '(SELECT auth.email())', c_ph), 'auth.email()', '(SELECT auth.email())'), c_ph, '(SELECT auth.email())');
    v_check := replace(replace(replace(r.with_check, '(SELECT auth.email())', c_ph), 'auth.email()', '(SELECT auth.email())'), c_ph, '(SELECT auth.email())');
    BEGIN
      IF r.qual IS NOT NULL AND r.with_check IS NOT NULL THEN
        EXECUTE format('ALTER POLICY %I ON public.%I USING (%s) WITH CHECK (%s)', r.policyname, r.tablename, v_qual, v_check);
      ELSIF r.qual IS NOT NULL THEN
        EXECUTE format('ALTER POLICY %I ON public.%I USING (%s)', r.policyname, r.tablename, v_qual);
      ELSIF r.with_check IS NOT NULL THEN
        EXECUTE format('ALTER POLICY %I ON public.%I WITH CHECK (%s)', r.policyname, r.tablename, v_check);
      ELSE v_skip := v_skip + 1; CONTINUE;
      END IF;
      v_ok := v_ok + 1;
      RAISE NOTICE '✓ [050] auth.email() wrapped: %.% (%)', r.tablename, r.policyname, r.cmd;
    EXCEPTION WHEN OTHERS THEN
      v_fail := v_fail + 1;
      RAISE WARNING '[050] ✗ auth.email() %.% (%): %', r.tablename, r.policyname, r.cmd, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE '[050] Pass 2 auth.email(): optimized=%, skipped=%, failed=%', v_ok, v_skip, v_fail;
END;
$$;

-- Pass 3: Fix bare auth.jwt()
DO $$
DECLARE
  r       RECORD;
  v_ok    int := 0;
  v_skip  int := 0;
  v_fail  int := 0;
  v_qual  text;
  v_check text;
  c_ph    CONSTANT text := '<<AUTH_JWT_ALREADY_WRAPPED>>';
BEGIN
  FOR r IN
    SELECT p.policyname, p.tablename, p.cmd, p.qual, p.with_check
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND (
        (p.qual IS NOT NULL AND p.qual LIKE '%auth.jwt()%' AND p.qual NOT LIKE '%(SELECT auth.jwt())%')
        OR (p.with_check IS NOT NULL AND p.with_check LIKE '%auth.jwt()%' AND p.with_check NOT LIKE '%(SELECT auth.jwt())%')
      )
    ORDER BY p.tablename, p.policyname
  LOOP
    v_qual  := replace(replace(replace(r.qual,       '(SELECT auth.jwt())', c_ph), 'auth.jwt()', '(SELECT auth.jwt())'), c_ph, '(SELECT auth.jwt())');
    v_check := replace(replace(replace(r.with_check, '(SELECT auth.jwt())', c_ph), 'auth.jwt()', '(SELECT auth.jwt())'), c_ph, '(SELECT auth.jwt())');
    BEGIN
      IF r.qual IS NOT NULL AND r.with_check IS NOT NULL THEN
        EXECUTE format('ALTER POLICY %I ON public.%I USING (%s) WITH CHECK (%s)', r.policyname, r.tablename, v_qual, v_check);
      ELSIF r.qual IS NOT NULL THEN
        EXECUTE format('ALTER POLICY %I ON public.%I USING (%s)', r.policyname, r.tablename, v_qual);
      ELSIF r.with_check IS NOT NULL THEN
        EXECUTE format('ALTER POLICY %I ON public.%I WITH CHECK (%s)', r.policyname, r.tablename, v_check);
      ELSE v_skip := v_skip + 1; CONTINUE;
      END IF;
      v_ok := v_ok + 1;
      RAISE NOTICE '✓ [050] auth.jwt() wrapped: %.% (%)', r.tablename, r.policyname, r.cmd;
    EXCEPTION WHEN OTHERS THEN
      v_fail := v_fail + 1;
      RAISE WARNING '[050] ✗ auth.jwt() %.% (%): %', r.tablename, r.policyname, r.cmd, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE '[050] Pass 3 auth.jwt(): optimized=%, skipped=%, failed=%', v_ok, v_skip, v_fail;
END;
$$;

-- Validation
DO $$
DECLARE
  v_bare_uid   int;
  v_bare_role  int;
  v_bare_email int;
  v_bare_jwt   int;
BEGIN
  SELECT count(*) INTO v_bare_uid FROM pg_policies WHERE schemaname = 'public'
    AND ((qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%') OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%'));
  SELECT count(*) INTO v_bare_role FROM pg_policies WHERE schemaname = 'public'
    AND ((qual LIKE '%auth.role()%' AND qual NOT LIKE '%(SELECT auth.role())%') OR (with_check LIKE '%auth.role()%' AND with_check NOT LIKE '%(SELECT auth.role())%'));
  SELECT count(*) INTO v_bare_email FROM pg_policies WHERE schemaname = 'public'
    AND ((qual LIKE '%auth.email()%' AND qual NOT LIKE '%(SELECT auth.email())%') OR (with_check LIKE '%auth.email()%' AND with_check NOT LIKE '%(SELECT auth.email())%'));
  SELECT count(*) INTO v_bare_jwt FROM pg_policies WHERE schemaname = 'public'
    AND ((qual LIKE '%auth.jwt()%' AND qual NOT LIKE '%(SELECT auth.jwt())%') OR (with_check LIKE '%auth.jwt()%' AND with_check NOT LIKE '%(SELECT auth.jwt())%'));

  RAISE NOTICE '[050] Post-050 bare auth.* summary: uid=%, role=%, email=%, jwt=%', v_bare_uid, v_bare_role, v_bare_email, v_bare_jwt;

  IF (v_bare_uid + v_bare_role + v_bare_email + v_bare_jwt) = 0 THEN
    RAISE NOTICE '✓ [050] ALL auth.* functions wrapped in all public policies — auth_rls_initplan fully cleared';
  ELSE
    RAISE WARNING '[050] Some bare auth.* calls remain — investigate';
  END IF;

  RAISE NOTICE '[050] Migration 050 complete.';
END;
$$;
;
