-- FIX 1
CREATE OR REPLACE FUNCTION public.fn_run_and_persist_smoke_tests()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
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

-- FIX 2
DROP POLICY IF EXISTS anon_read_kill_switches ON public.system_kill_switches;
