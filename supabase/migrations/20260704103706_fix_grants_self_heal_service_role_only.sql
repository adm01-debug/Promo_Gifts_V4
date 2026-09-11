CREATE OR REPLACE FUNCTION public.fn_audit_and_fix_grants(p_source text DEFAULT 'cron') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $g$
DECLARE r record; v_fixed int := 0;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname LIKE 'fn\_%'
      AND p.prorettype <> 'pg_catalog.trigger'::regtype
      AND NOT has_function_privilege('service_role', p.oid, 'EXECUTE')
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    INSERT INTO public.ops_grant_audit(fn_signature, roles_fixed, run_source)
    VALUES (r.sig, 'service_role', p_source);
    v_fixed := v_fixed + 1;
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'fixed', v_fixed, 'scope', 'service_role_only', 'at', now());
END $g$;

COMMENT ON FUNCTION public.fn_audit_and_fix_grants(text) IS
'v2 (corrigido): concede EXECUTE APENAS a service_role e ignora funcoes de trigger. A v1 concedia a anon/authenticated tambem, expondo funcoes privilegiadas a chave publica. Nao revoga grants existentes.';;
