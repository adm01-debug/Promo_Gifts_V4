CREATE TABLE IF NOT EXISTS public.ops_grant_audit (id bigserial PRIMARY KEY, at timestamptz DEFAULT now(), fn_signature text, roles_fixed text, run_source text);

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
      AND NOT (
        has_function_privilege('anon', p.oid, 'EXECUTE')
        AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
        AND has_function_privilege('service_role', p.oid, 'EXECUTE')
      )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated, service_role', r.sig);
    INSERT INTO public.ops_grant_audit(fn_signature, roles_fixed, run_source)
    VALUES (r.sig, 'anon,authenticated,service_role', p_source);
    v_fixed := v_fixed + 1;
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'fixed', v_fixed, 'at', now());
END $g$;

SELECT cron.schedule('ops-grants-self-heal', '0 6 * * 1', $$SELECT public.fn_audit_and_fix_grants('cron')$$);;
