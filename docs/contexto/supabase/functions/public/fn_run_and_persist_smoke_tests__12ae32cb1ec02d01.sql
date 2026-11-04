CREATE OR REPLACE FUNCTION public.fn_run_and_persist_smoke_tests()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ran_at timestamptz := now();
  v_role   text;
BEGIN
  v_role := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), ''))::jsonb->>'role',
    ''
  );

  IF v_role NOT IN ('', 'service_role')
     AND NOT coalesce(public.is_admin_or_above((SELECT auth.uid())), false)
  THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO public.smoke_test_runs (ran_at, test_name, result)
  SELECT v_ran_at, test_name, result
  FROM public.fn_run_smoke_tests();
END
$function$
