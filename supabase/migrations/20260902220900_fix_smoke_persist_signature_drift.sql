-- Cron 32 (smoke_tests_monthly) falhava: fn_run_smoke_tests() foi simplificada
-- para TABLE(test_name, result), mas a persist ainda selecionava
-- test_category/details/duration_ms (colunas nullable em smoke_test_runs).
-- Aplicada em produção via MCP em 2026-09-02.
CREATE OR REPLACE FUNCTION public.fn_run_and_persist_smoke_tests()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ran_at timestamptz := now();
BEGIN
  -- Permite: pg_cron (current_user='postgres', auth.uid()=NULL)
  -- Permite: service_role (request.jwt.claim.role='service_role')
  -- Bloqueia: chamadas HTTP de usuários não-admin
  IF auth.uid() IS NOT NULL
     AND coalesce(current_setting('request.jwt.claim.role', true), '') NOT IN ('', 'service_role')
     AND NOT public.is_admin_or_above((SELECT auth.uid()))
  THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO public.smoke_test_runs (ran_at, test_name, result)
  SELECT v_ran_at, test_name, result
  FROM public.fn_run_smoke_tests();
END
$function$;
