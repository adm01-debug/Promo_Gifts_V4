-- Review cubic (2ª rodada) no PR #1825:
-- (a) fn_run_and_persist_smoke_tests era SECURITY INVOKER e a inner
--     fn_run_smoke_tests não tem EXECUTE para authenticated (hardening antigo)
--     — admin autenticado passava no guard e quebrava na chamada interna.
--     Wrapper agora é SECURITY DEFINER (owner tem EXECUTE na inner); o guard
--     interno continua sendo a autorização.
-- (b) teste 01: count(*)>=0 só falhava por exception; to_regclass detecta
--     ausência de auth.users como FAIL granular.
-- Aplicada em produção via MCP em 2026-09-03; validado: guard bloqueia
-- authenticated não-admin e a bateria segue 38/38 PASS.
CREATE OR REPLACE FUNCTION public.fn_run_and_persist_smoke_tests()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
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

-- ACL explícita (idempotente; estado verificado em produção via pg_proc.proacl:
-- {postgres,authenticated,service_role}). Num replay com ACL default, o grant
-- herdado de PUBLIC deixaria qualquer role invocar o wrapper SECURITY DEFINER.
REVOKE EXECUTE ON FUNCTION public.fn_run_and_persist_smoke_tests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_run_and_persist_smoke_tests() TO authenticated, service_role;

-- Teste 01 → verificação estrutural via to_regclass (patch tolerante:
-- aceita tanto o padrão count>=0 quanto o OR TRUE original de um replay).
DO $$
DECLARE v_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'fn_run_smoke_tests';

  IF position('to_regclass(''auth.users'')' in v_def) > 0 THEN
    RAISE NOTICE 'teste 01 já usa to_regclass — nada a fazer';
    RETURN;
  END IF;

  v_def := replace(v_def,
    '(SELECT COUNT(*) FROM auth.users) >= 0',
    'to_regclass(''auth.users'') IS NOT NULL');
  v_def := replace(v_def,
    'EXISTS (SELECT 1 FROM auth.users LIMIT 1) OR TRUE',
    'to_regclass(''auth.users'') IS NOT NULL');

  IF position('to_regclass(''auth.users'')' in v_def) = 0 THEN
    -- Definição divergiu de todo padrão conhecido: falhar alto em vez de
    -- deixar o teste 01 sem patch silenciosamente (review cubic).
    RAISE EXCEPTION 'teste 01: nenhum padrão conhecido encontrado em fn_run_smoke_tests — investigar drift';
  END IF;

  EXECUTE v_def;
END $$;
