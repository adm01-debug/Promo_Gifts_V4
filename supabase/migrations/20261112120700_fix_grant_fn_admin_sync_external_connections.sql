-- connections-sync: devolver EXECUTE de fn_admin_sync_external_connections() a authenticated.
-- Causa: 20260611183200 criou o wrapper admin-gated com GRANT EXECUTE TO authenticated para o
-- botao "Executar sync" (/admin/conexoes > LastSyncRunPanel -> gold.ts rpcAdminSyncExternalConnections).
-- 20260716131209 (SEC P1-2, lista "revoke_from_auth") revogou esse EXECUTE junto com funcoes sem
-- checagem de chamador; o wrapper entrou na lista por ser SECDEF, mas ja barra quem nao e admin.
-- Producao hoje: exec_api=service_role -> o botao recebe 42501 e o sync manual nunca roda.
-- Menor privilegio: so o wrapper volta a authenticated; o corpo exige
-- public.has_role(auth.uid(), 'admin') e levanta 42501 para vendedor/dev/coord.
-- A funcao interna sync_external_connections_from_credentials (as 2 sobrecargas) continua
-- sem EXECUTE para anon/authenticated (nao e tocada aqui).
-- NAO re-incluir fn_admin_sync_external_connections em hardening de "revoke from authenticated":
-- e o unico caminho do front para o sync manual.
-- Lint 0029 (SECDEF executavel por authenticated): a funcao volta a aparecer no gate
-- scripts/check-lint-0029-drift.mjs (--require-live via supabase-linter-gate.yml); a mesma PR
-- adiciona "public.fn_admin_sync_external_connections()" em .security/lint-0029-allowlist.json.
-- Rollback: REVOKE EXECUTE ON FUNCTION public.fn_admin_sync_external_connections() FROM authenticated;
--           (arquivo: supabase/rollbacks/20261112120700_rollback.sql)

-- Guarda: so concede se o wrapper existe, e SECDEF e ainda contem a checagem de admin.
DO $$
DECLARE
  v_src text;
  v_secdef boolean;
BEGIN
  SELECT p.prosrc, p.prosecdef
    INTO v_src, v_secdef
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'fn_admin_sync_external_connections'
     AND pg_catalog.pg_get_function_identity_arguments(p.oid) = '';

  IF v_src IS NULL THEN
    RAISE EXCEPTION 'connections-sync: public.fn_admin_sync_external_connections() nao existe';
  END IF;
  IF NOT v_secdef
     OR v_src !~* 'has_role\s*\('
     OR v_src !~* '''admin'''
     OR v_src !~* '42501' THEN
    RAISE EXCEPTION 'connections-sync: wrapper sem a guarda de admin esperada; GRANT abortado';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_admin_sync_external_connections() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_admin_sync_external_connections() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_admin_sync_external_connections() TO service_role;
