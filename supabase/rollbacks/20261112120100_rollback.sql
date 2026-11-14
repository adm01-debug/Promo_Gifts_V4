-- Rollback: 20261112120100_fix_smoke_tests_dashboard_admin_rpc
-- Remove as duas RPCs admin do dashboard de smoke tests.
-- Depois deste rollback o painel /admin/observabilidade volta a falhar com 42501
-- (views e fn_run_and_persist_smoke_tests seguem sem acesso para authenticated, estado anterior).
-- Reverter junto o front (useSmokeTests.ts) se o rollback for definitivo.

DROP FUNCTION IF EXISTS public.fn_admin_run_smoke_tests();
DROP FUNCTION IF EXISTS public.fn_admin_smoke_tests_dashboard();
