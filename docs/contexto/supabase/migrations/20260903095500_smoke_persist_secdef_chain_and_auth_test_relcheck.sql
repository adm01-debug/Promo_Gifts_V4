CREATE OR REPLACE FUNCTION public.fn_run_and_persist_smoke_tests()

REVOKE EXECUTE ON FUNCTION public.fn_run_and_persist_smoke_tests() FROM PUBLIC, anon

GRANT EXECUTE ON FUNCTION public.fn_run_and_persist_smoke_tests() TO authenticated, service_role
