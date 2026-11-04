-- FIX 1: sem SECURITY DEFINER (pg_cron executa como postgres → bypassa RLS)
CREATE OR REPLACE FUNCTION public.fn_run_and_persist_smoke_tests()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ran_at timestamptz := now();
BEGIN
  IF coalesce(current_setting('request.jwt.claim.role', true), '') != ''
     AND NOT public.is_admin_or_above((SELECT auth.uid()))
  THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO public.smoke_test_runs (ran_at, test_name, test_category, result, details, duration_ms)
  SELECT v_ran_at, test_name, test_category, result, details, duration_ms
  FROM public.fn_run_smoke_tests();
END
$function$;

-- FIX 2: remove policy SELECT redundante
DROP POLICY IF EXISTS anon_read_kill_switches ON public.system_kill_switches;
