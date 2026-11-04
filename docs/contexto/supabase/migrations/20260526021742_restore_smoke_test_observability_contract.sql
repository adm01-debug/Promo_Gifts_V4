CREATE TABLE IF NOT EXISTS public.smoke_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  test_name text NOT NULL,
  test_category text,
  result text NOT NULL,
  details text,
  duration_ms numeric
);
CREATE INDEX IF NOT EXISTS idx_smoke_test_runs_ran_at ON public.smoke_test_runs (ran_at DESC);
CREATE INDEX IF NOT EXISTS idx_smoke_test_runs_name_ran_at ON public.smoke_test_runs (test_name, ran_at DESC);
ALTER TABLE public.smoke_test_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.smoke_test_runs FROM anon;
GRANT SELECT, INSERT ON TABLE public.smoke_test_runs TO authenticated;
DROP POLICY IF EXISTS smoke_test_runs_select_admin ON public.smoke_test_runs;
CREATE POLICY smoke_test_runs_select_admin ON public.smoke_test_runs FOR SELECT TO authenticated USING (public.is_admin_or_above((SELECT auth.uid())));
DROP POLICY IF EXISTS smoke_test_runs_insert_admin ON public.smoke_test_runs;
CREATE POLICY smoke_test_runs_insert_admin ON public.smoke_test_runs FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_above((SELECT auth.uid())));
DROP FUNCTION IF EXISTS public.fn_run_and_persist_smoke_tests() CASCADE;
CREATE OR REPLACE FUNCTION public.fn_run_and_persist_smoke_tests() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$ DECLARE v_ran_at timestamptz := now(); BEGIN IF NOT public.is_admin_or_above((SELECT auth.uid())) THEN RAISE EXCEPTION 'not authorized'; END IF; INSERT INTO public.smoke_test_runs (ran_at,test_name,test_category,result,details,duration_ms) SELECT v_ran_at,test_name,test_category,result,details,duration_ms FROM public.fn_run_smoke_tests(); END; $function$;
REVOKE ALL ON FUNCTION public.fn_run_and_persist_smoke_tests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_run_and_persist_smoke_tests() TO authenticated;
DROP VIEW IF EXISTS public.v_smoke_tests_latest_run;
CREATE VIEW public.v_smoke_tests_latest_run WITH (security_invoker = on) AS SELECT ran_at,test_name,test_category,result,details,duration_ms FROM public.smoke_test_runs WHERE ran_at = (SELECT max(ran_at) FROM public.smoke_test_runs) ORDER BY CASE WHEN result LIKE '%FAIL%' THEN 0 WHEN result LIKE '%WARN%' THEN 1 ELSE 2 END, test_name;
DROP VIEW IF EXISTS public.v_smoke_tests_trend;
CREATE VIEW public.v_smoke_tests_trend WITH (security_invoker = on) AS SELECT ran_at,count(*)::integer AS total,count(*) FILTER (WHERE result LIKE '%PASS%')::integer AS passed,count(*) FILTER (WHERE result LIKE '%FAIL%')::integer AS failed,count(*) FILTER (WHERE result LIKE '%WARN%')::integer AS warned,avg(duration_ms) AS avg_duration_ms FROM public.smoke_test_runs GROUP BY ran_at ORDER BY ran_at DESC LIMIT 12;
GRANT SELECT ON public.v_smoke_tests_latest_run TO authenticated;
GRANT SELECT ON public.v_smoke_tests_trend TO authenticated;
REVOKE SELECT ON public.v_smoke_tests_latest_run FROM anon;
REVOKE SELECT ON public.v_smoke_tests_trend FROM anon;
