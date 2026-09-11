DO $$
DECLARE
  r       RECORD;
  v_name  text;
  v_ok    int := 0;
  v_fail  int := 0;
  v_funcs text[] := ARRAY[
    'fn_super_filtro',
    'fn_super_filtro_facets',
    'fn_super_filtro_price_range',
    'get_catalog_bestseller_page',
    'get_promo_sales_ranking'
  ];
BEGIN
  FOREACH v_name IN ARRAY v_funcs
  LOOP
    FOR r IN
      SELECT p.oid,
             p.proname,
             pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = v_name
      ORDER BY p.oid
    LOOP
      BEGIN
        EXECUTE format(
          'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC',
          r.proname, r.args
        );
        EXECUTE format(
          'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated',
          r.proname, r.args
        );
        EXECUTE format(
          'GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role',
          r.proname, r.args
        );
        v_ok := v_ok + 1;
        RAISE NOTICE '[059] Revoked PUBLIC; re-granted authenticated+service_role: %(%)',
          r.proname, r.args;
      EXCEPTION WHEN OTHERS THEN
        v_fail := v_fail + 1;
        RAISE WARNING '[059] Failed for %(%): %', r.proname, r.args, SQLERRM;
      END;
    END LOOP;
  END LOOP;

  RAISE NOTICE '[059] Phase 1 complete: ok=%, fail=%', v_ok, v_fail;

  IF v_fail > 0 THEN
    RAISE WARNING '[059] % function(s) could not be fixed', v_fail;
  END IF;
END;
$$;

DO $$
DECLARE
  r              RECORD;
  v_anon_remain  int := 0;
  v_auth_ok      int := 0;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'fn_super_filtro', 'fn_super_filtro_facets', 'fn_super_filtro_price_range',
        'get_catalog_bestseller_page', 'get_promo_sales_ranking'
      )
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
    ORDER BY p.proname
  LOOP
    v_anon_remain := v_anon_remain + 1;
    RAISE WARNING '[059] Still anon-callable: %(%)', r.proname, r.args;
  END LOOP;

  IF v_anon_remain = 0 THEN
    RAISE NOTICE '[059] All 5 catalog SECURITY DEFINER functions: anon EXECUTE revoked';
  ELSE
    RAISE WARNING '[059] % function(s) still anon-callable', v_anon_remain;
  END IF;

  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'fn_super_filtro', 'fn_super_filtro_facets', 'fn_super_filtro_price_range',
        'get_catalog_bestseller_page', 'get_promo_sales_ranking'
      )
    ORDER BY p.proname
  LOOP
    IF has_function_privilege('authenticated', r.oid, 'EXECUTE') THEN
      v_auth_ok := v_auth_ok + 1;
      RAISE NOTICE '[059] authenticated can still call %(%)', r.proname, r.args;
    ELSE
      RAISE WARNING '[059] authenticated LOST EXECUTE on %(%)', r.proname, r.args;
    END IF;
  END LOOP;

  DECLARE
    v_total_anon_secdef int;
  BEGIN
    SELECT count(*) INTO v_total_anon_secdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
      AND p.proname NOT IN (
        'check_login_rate_limit', 'fn_check_login_allowed',
        'enforce_password_reset_rate_limit', 'get_quote_token_by_value',
        'submit_quote_response'
      );

    IF v_total_anon_secdef = 0 THEN
      RAISE NOTICE '[059] anon_security_definer_function_executable — 0 unauthorized functions remain';
    ELSE
      RAISE WARNING '[059] % unauthorized anon-callable SECURITY DEFINER functions still remain', v_total_anon_secdef;
    END IF;
  END;

  RAISE NOTICE 'Migration 059 complete.';
END;
$$;;
