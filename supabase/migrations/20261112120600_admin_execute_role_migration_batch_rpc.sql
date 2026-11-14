-- Migração de papéis em lote (/admin/seguranca/migracao-papeis) quebrada com 42501.
-- Causa: 20260716000005/20260716131209 (SEC P1-2, "Grant/permission manipulation")
-- revogaram EXECUTE de authenticated em public.execute_role_migration_batch; o hook
-- src/hooks/admin/useRoleMigration.ts chama a RPC com o JWT do usuário logado.
-- Correção sem desfazer o hardening: a função interna continua só service_role e
-- nasce um wrapper com a guarda da rota (DevRoute + mfaAal2): role 'dev' E claim
-- JWT aal=aal2 (mesma guarda de admin_active_sessions, 20261015150000).
-- O wrapper repassa a chamada; auth.uid() continua sendo o chamador (lido do JWT),
-- então a guarda interna is_admin_strict e a trilha em admin_audit_log seguem com
-- o usuário real.
--
-- search_path: `pg_catalog, pg_temp` DIVERGE de propósito da SEC-003
-- (20261101160001), que deixou admin_active_sessions/admin_revoke_user_sessions
-- com `pg_catalog` sem pg_temp. Motivo: o preflight E066 do próprio workflow de
-- apply (scripts/preflight-migration-apply.mjs, detectSecurityDefinerWithoutPgTemp,
-- rodado com --require-live em db-apply-migration.yml) BLOQUEIA SECURITY DEFINER
-- sem pg_temp. pg_temp por último é a forma recomendada pela doc do Postgres
-- ("Writing SECURITY DEFINER Functions Safely"): se pg_temp não for listado, ele é
-- pesquisado PRIMEIRO para tabelas/tipos. O corpo usa só nomes qualificados
-- (public.has_role, auth.uid, auth.jwt, public.execute_role_migration_batch).
-- Precedente pós-SEC-003: 20261112011000_fix_sb0003_fn_get_rupture_alerts.sql.
--
-- Owner: postgres, igual à interna (baseline 20261015140000: ALTER FUNCTION
-- execute_role_migration_batch ... OWNER TO postgres), para o wrapper ter EXECUTE
-- na interna independentemente do PGUSER do workflow.
--
-- Lint 0029: entrada nova em .security/lint-0029-allowlist.json + justificativa em
-- docs/security/ALLOWLISTS_MEMORY.md (família "Batch admin") na mesma PR.
--
-- Rollback: DROP FUNCTION IF EXISTS public.admin_execute_role_migration_batch(text, text, jsonb, boolean);
--   (arquivo: supabase/rollbacks/20261112120600_rollback.sql)

CREATE OR REPLACE FUNCTION public.admin_execute_role_migration_batch(
  _label text,
  _reason text,
  _items jsonb,
  _dry_run boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'dev'::public.app_role) THEN
    RAISE EXCEPTION 'insufficient_privilege: requer role dev'
      USING ERRCODE = '42501';
  END IF;

  -- Espelha mfaAal2 da rota: claim aal do JWT já verificado pelo PostgREST.
  IF coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' THEN
    RAISE EXCEPTION 'insufficient_privilege: requer sessão AAL2'
      USING ERRCODE = '42501';
  END IF;

  RETURN public.execute_role_migration_batch(_label, _reason, _items, _dry_run);
END;
$$;

ALTER FUNCTION public.admin_execute_role_migration_batch(text, text, jsonb, boolean) OWNER TO postgres;

REVOKE EXECUTE ON FUNCTION public.admin_execute_role_migration_batch(text, text, jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_execute_role_migration_batch(text, text, jsonb, boolean) TO authenticated, service_role;

-- Reafirma o hardening de SEC P1-2: a função interna segue fora do alcance do browser.
REVOKE EXECUTE ON FUNCTION public.execute_role_migration_batch(text, text, jsonb, boolean) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.admin_execute_role_migration_batch(text, text, jsonb, boolean) IS
  'Executa lote de migração de papéis (dev + aal2) via execute_role_migration_batch. Tela: /admin/seguranca/migracao-papeis.';
