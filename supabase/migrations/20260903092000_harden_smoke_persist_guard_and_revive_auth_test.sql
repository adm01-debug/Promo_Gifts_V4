-- Findings da review do Copilot no PR #1825 (verificados em produção):
-- (a) anon tinha EXECUTE em fn_run_and_persist_smoke_tests e o guard só
--     disparava com auth.uid() NOT NULL — visitante anônimo podia rodar a
--     bateria via RPC (COUNTs pesados + INSERT em smoke_test_runs).
-- (b) teste 01 (auth_schema_accessible) tinha "OR TRUE" — nunca falhava.
-- Aplicada em produção via MCP em 2026-09-03; validado: guard bloqueia
-- authenticated não-admin (not authorized) e a bateria segue 38/38 PASS.

-- Defesa primária: visitante público jamais precisa rodar smoke tests.
REVOKE EXECUTE ON FUNCTION public.fn_run_and_persist_smoke_tests() FROM anon;

-- Guard por role do JWT (não por auth.uid): pg_cron (role vazio) e
-- service_role passam; anon e authenticated não-admin bloqueiam.
-- coalesce(..., false) cobre is_admin_or_above(NULL) retornando NULL.
CREATE OR REPLACE FUNCTION public.fn_run_and_persist_smoke_tests()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ran_at timestamptz := now();
BEGIN
  -- Permite: pg_cron (request.jwt.claim.role ausente/vazio)
  -- Permite: service_role e usuários admin
  -- Bloqueia: anon e authenticated não-admin
  IF coalesce(current_setting('request.jwt.claim.role', true), '') NOT IN ('', 'service_role')
     AND NOT coalesce(public.is_admin_or_above((SELECT auth.uid())), false)
  THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO public.smoke_test_runs (ran_at, test_name, result)
  SELECT v_ran_at, test_name, result
  FROM public.fn_run_smoke_tests();
END
$function$;

-- Teste 01 reativado: remove o "OR TRUE" por patch de string exata sobre a
-- definição vigente (falha alto se a string não casar, em vez de no-op).
DO $$
DECLARE v_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'fn_run_smoke_tests';

  v_def := replace(v_def,
    'EXISTS (SELECT 1 FROM auth.users LIMIT 1) OR TRUE',
    '(SELECT COUNT(*) FROM auth.users) >= 0');

  IF position('OR TRUE' in v_def) > 0 THEN
    RAISE EXCEPTION 'patch do teste 01 não aplicou — string alvo não encontrada';
  END IF;

  EXECUTE v_def;
END $$;
