CREATE OR REPLACE FUNCTION public.fn_admin_run_smoke_tests()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
BEGIN
  IF NOT coalesce(public.is_admin_or_above((SELECT auth.uid())), false) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  -- Executa como owner (postgres); a guarda interna de fn_run_and_persist_smoke_tests
  -- (role do JWT + is_admin_or_above) continua valendo.
  PERFORM public.fn_run_and_persist_smoke_tests();
END
$function$
