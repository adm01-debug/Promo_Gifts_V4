CREATE OR REPLACE FUNCTION public.fn_purge_spr_history -- regex fix TO ((...))

REVOKE EXECUTE ON FUNCTION public.fn_purge_spr_history FROM PUBLIC, anon, authenticated

CREATE OR REPLACE FUNCTION public.fn_run_smoke_tests -- relkind IN (r,p)
