-- Smoke tests (/admin/observabilidade): restaurar leitura e execucao manual via RPC com guarda de papel.
-- Causa:
--   * v_smoke_tests_latest_run / v_smoke_tests_trend tiveram SELECT revogado de authenticated em
--     20260716192234_revoke_auth_select_admin_views.sql (hardening intencional de views admin)
--     -> useSmokeTests.load() falha com 42501 "permission denied for view".
--   * fn_run_and_persist_smoke_tests() esta com EXECUTE so para service_role em producao
--     (revogado fora do repo, depois de 20260903100000) -> runNow() falha com 42501.
-- Solucao (mesmo padrao do SB-0003, 20261112011000): sem GRANT direto nas views e sem reabrir a
-- funcao interna; duas RPCs SECURITY DEFINER que exigem is_admin_or_above (mesmo predicado da
-- policy smoke_test_runs_select_admin). Vendedor recebe 42501.
-- Rollback: DROP FUNCTION IF EXISTS public.fn_admin_smoke_tests_dashboard(); DROP FUNCTION IF EXISTS public.fn_admin_run_smoke_tests();
--   (arquivo: supabase/rollbacks/20261112120100_rollback.sql)
--
-- GUARD: as views v_smoke_tests_* continuam SEM SELECT para authenticated/anon (20260716192234).
-- GUARD: fn_run_and_persist_smoke_tests() continua sem EXECUTE para authenticated; o acesso do
--        front e so por fn_admin_run_smoke_tests(). O cron smoke_tests_monthly (postgres) nao muda.

CREATE OR REPLACE FUNCTION public.fn_admin_smoke_tests_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NOT coalesce(public.is_admin_or_above((SELECT auth.uid())), false) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'latest', coalesce((
      SELECT jsonb_agg(
               to_jsonb(l)
               ORDER BY CASE
                          WHEN l.result LIKE '%FAIL%' THEN 0
                          WHEN l.result LIKE '%WARN%' THEN 1
                          ELSE 2
                        END,
                        l.test_name
             )
      FROM public.v_smoke_tests_latest_run AS l
    ), '[]'::jsonb),
    'trend', coalesce((
      SELECT jsonb_agg(to_jsonb(t) ORDER BY t.ran_at DESC)
      FROM public.v_smoke_tests_trend AS t
    ), '[]'::jsonb)
  );
END
$$

COMMENT ON FUNCTION public.fn_admin_smoke_tests_dashboard() IS
'Dashboard de smoke tests (/admin/observabilidade): {latest, trend} de v_smoke_tests_latest_run e v_smoke_tests_trend. Exige is_admin_or_above; as views seguem revogadas para authenticated (20260716192234).'

REVOKE EXECUTE ON FUNCTION public.fn_admin_smoke_tests_dashboard() FROM PUBLIC, anon

GRANT EXECUTE ON FUNCTION public.fn_admin_smoke_tests_dashboard() TO authenticated, service_role

CREATE OR REPLACE FUNCTION public.fn_admin_run_smoke_tests()
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NOT coalesce(public.is_admin_or_above((SELECT auth.uid())), false) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  -- Executa como owner (postgres); a guarda interna de fn_run_and_persist_smoke_tests
  -- (role do JWT + is_admin_or_above) continua valendo.
  PERFORM public.fn_run_and_persist_smoke_tests();
END
$$

COMMENT ON FUNCTION public.fn_admin_run_smoke_tests() IS
'Execucao manual dos smoke tests pelo dashboard admin. Exige is_admin_or_above e delega para fn_run_and_persist_smoke_tests(), que segue sem EXECUTE para authenticated.'

REVOKE EXECUTE ON FUNCTION public.fn_admin_run_smoke_tests() FROM PUBLIC, anon

GRANT EXECUTE ON FUNCTION public.fn_admin_run_smoke_tests() TO authenticated, service_role

-- Post-check: ACL esperado das duas RPCs.
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.fn_admin_smoke_tests_dashboard()',
    'public.fn_admin_run_smoke_tests()'
  ] LOOP
    IF NOT has_function_privilege('authenticated', fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'post-check: authenticated sem EXECUTE em %', fn;
    END IF;
    IF has_function_privilege('anon', fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'post-check: anon com EXECUTE em %', fn;
    END IF;
  END LOOP;
END
$$
