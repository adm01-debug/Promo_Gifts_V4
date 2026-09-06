-- M8: fix JWT dual-read bypass em fn_run_and_persist_smoke_tests
--
-- Problema confirmado: M7 usava APENAS request.jwt.claim.role (GUC legado).
-- PostgREST PG14+ seta APENAS request.jwt.claims (JSON blob), NÃO o GUC legado.
-- Resultado: authenticated não-admin bypassa o guard via RPC PostgREST.
--
-- Fix: dual-read idêntico ao padrão interno de auth.role():
--   1. lê o GUC legado (compatibilidade pg_cron / auth.role() pré-PG14)
--   2. fallback para request.jwt.claims::jsonb->>'role' (PostgREST PG14+)
--   3. default '' → pg_cron (sem JWT algum) continua passando
--
-- Referência: diagnóstico Agente JWT 2026-09-03; PR #1825 review cubic.
CREATE OR REPLACE FUNCTION public.fn_run_and_persist_smoke_tests()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ran_at timestamptz := now();
  v_role   text;
BEGIN
  -- Dual-read: PostgREST PG14+ seta apenas request.jwt.claims (JSON blob);
  -- pg_cron não seta nenhum GUC JWT → v_role fica '' → bypass intencional.
  v_role := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), ''))::jsonb->>'role',
    ''
  );

  -- Permite: pg_cron (v_role=''), service_role, admin autenticado
  -- Bloqueia: authenticated não-admin (v_role='authenticated', não é admin)
  IF v_role NOT IN ('', 'service_role')
     AND NOT coalesce(public.is_admin_or_above((SELECT auth.uid())), false)
  THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO public.smoke_test_runs (ran_at, test_name, result)
  SELECT v_ran_at, test_name, result
  FROM public.fn_run_smoke_tests();
END
$function$;

-- ACL idempotente (reafirma estado de M7; protege contra replay sem M7)
REVOKE EXECUTE ON FUNCTION public.fn_run_and_persist_smoke_tests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_run_and_persist_smoke_tests() TO authenticated, service_role;
