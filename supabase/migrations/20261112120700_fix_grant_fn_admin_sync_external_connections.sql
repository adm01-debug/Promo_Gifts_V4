-- connections-sync: devolver EXECUTE de fn_admin_sync_external_connections() a authenticated.
-- Causa: 20260611183200 criou o wrapper admin-gated com GRANT EXECUTE TO authenticated para o
-- botao "Executar sync" (/admin/conexoes > LastSyncRunPanel -> gold.ts rpcAdminSyncExternalConnections).
-- 20260716131209 (SEC P1-2, lista "revoke_from_auth") revogou esse EXECUTE junto com funcoes sem
-- checagem de chamador; o wrapper entrou na lista por ser SECDEF, mas ja barra quem nao e admin.
-- Producao hoje: exec_api=service_role -> o botao recebe 42501 e o sync manual nunca roda.
-- Guarda alinhada a rota: /admin/conexoes fica em DevRoute (papel 'dev', src/routes/admin-routes.tsx),
-- mas o corpo exigia so has_role 'admin' (sem hierarquia) -> nenhum usuario real alcancava a tela E
-- passava na guarda. O wrapper passa a aceitar dev OU admin (mesmo padrao de 120500/120600) e levanta
-- 42501 para os demais. Menor privilegio: so o wrapper volta a authenticated.
-- A funcao interna sync_external_connections_from_credentials (as 2 sobrecargas) continua
-- sem EXECUTE para anon/authenticated (nao e tocada aqui).
-- Chamada explicita: em producao existem () e (text,text,uuid) com todos os args DEFAULT, entao
-- "sync_external_connections_from_credentials()" falha com 42725 (not unique). O wrapper chama a
-- sobrecarga de 3 args (a que grava external_connections_sync_log, lido por LastSyncRunPanel), na
-- mesma forma usada por trg_sync_external_connections().
-- NAO re-incluir fn_admin_sync_external_connections em hardening de "revoke from authenticated":
-- e o unico caminho do front para o sync manual.
-- search_path: 'pg_catalog', 'pg_temp' (pg_temp por ultimo). O valor '' do corpo antigo e bloqueado pelo
-- preflight E066 do db-apply-migration.yml (detectSecurityDefinerWithoutPgTemp) e, sem pg_temp listado,
-- o Postgres pesquisa pg_temp PRIMEIRO. O corpo usa so nomes qualificados (public.*, auth.uid).
-- Lint 0029 (SECDEF executavel por authenticated): a funcao volta a aparecer no gate
-- scripts/check-lint-0029-drift.mjs (--require-live via supabase-linter-gate.yml); a mesma PR
-- adiciona "public.fn_admin_sync_external_connections()" em .security/lint-0029-allowlist.json.
-- Rollback: restaura o corpo admin-only e REVOKE EXECUTE ... FROM authenticated
--           (arquivo: supabase/rollbacks/20261112120700_rollback.sql)

-- Guarda: o wrapper precisa existir com a assinatura () antes de ser substituido.
DO $$
BEGIN
  IF to_regprocedure('public.fn_admin_sync_external_connections()') IS NULL THEN
    RAISE EXCEPTION 'connections-sync: public.fn_admin_sync_external_connections() nao existe';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_admin_sync_external_connections()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
BEGIN
  IF NOT (public.is_dev((SELECT auth.uid()))
          OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN public.sync_external_connections_from_credentials(NULL::text, 'manual'::text, (SELECT auth.uid()));
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.fn_admin_sync_external_connections() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_admin_sync_external_connections() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_admin_sync_external_connections() TO service_role;

-- Assercao: SECDEF, guarda dev/admin no corpo e EXECUTE so onde deve.
DO $$
DECLARE
  v_src text;
  v_secdef boolean;
BEGIN
  SELECT p.prosrc, p.prosecdef INTO v_src, v_secdef
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.fn_admin_sync_external_connections()'::regprocedure;
  IF NOT v_secdef OR v_src !~* 'is_dev\s*\(' OR v_src !~* '''admin''' OR v_src !~* '42501' THEN
    RAISE EXCEPTION 'connections-sync: wrapper sem a guarda dev/admin esperada';
  END IF;
  -- Sem chamada ambigua (42725): o corpo nao pode chamar a sync sem argumentos e a forma usada
  -- precisa resolver para uma unica sobrecarga.
  IF v_src ~* 'sync_external_connections_from_credentials\s*\(\s*\)' THEN
    RAISE EXCEPTION 'connections-sync: wrapper chama sync_external_connections_from_credentials() sem argumentos (ambiguo, 42725)';
  END IF;
  EXECUTE 'EXPLAIN SELECT public.sync_external_connections_from_credentials(NULL::text, ''manual''::text, NULL::uuid)';
  IF NOT has_function_privilege('authenticated', 'public.fn_admin_sync_external_connections()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.fn_admin_sync_external_connections()', 'EXECUTE') THEN
    RAISE EXCEPTION 'connections-sync: EXECUTE inesperado (authenticated deve ter; anon nao)';
  END IF;
END;
$$;
