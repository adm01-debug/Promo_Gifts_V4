-- SEC-004b: Revoga EXECUTE de fn_cron_guard para authenticated
-- Severidade: ALTO | Tipo: SEGURANÇA
-- Evidência: information_schema.routine_privileges → authenticated tem EXECUTE em fn_cron_guard(bigint,text)
-- fn_cron_guard executa SQL dinâmico passado como parâmetro p_sql → injeção de SQL para qualquer autenticado.
-- Impacto: usuário logado pode executar queries arbitrárias com privilégios do owner da função.
-- Risco de regressão: baixo — callers legítimos são service_role e postgres (cron interno).

REVOKE EXECUTE ON FUNCTION public.fn_cron_guard(bigint, text) FROM authenticated;

-- Verificação pós-apply:
--   SELECT grantee FROM information_schema.routine_privileges
--   WHERE routine_schema='public' AND routine_name='fn_cron_guard' AND grantee='authenticated';
--   → 0 rows

-- ROLLBACK:
-- GRANT EXECUTE ON FUNCTION public.fn_cron_guard(bigint, text) TO authenticated;
