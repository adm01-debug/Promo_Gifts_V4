-- Pendência do incidente 2026-10-13 (Agente 2, fase 3), nunca aplicada em produção:
--   resolve o lint multiple_permissive_policies em public.system_settings (tabela de 2 linhas, fria).
-- Rollback:
--   DROP POLICY IF EXISTS system_settings_anon_select ON public.system_settings;
--   DROP POLICY IF EXISTS system_settings_authenticated_select ON public.system_settings;
--   DROP POLICY IF EXISTS system_settings_admin_insert ON public.system_settings;
--   DROP POLICY IF EXISTS system_settings_admin_update ON public.system_settings;
--   DROP POLICY IF EXISTS system_settings_admin_delete ON public.system_settings;
--   CREATE POLICY system_settings_admin_all ON public.system_settings FOR ALL TO authenticated
--     USING (is_admin((SELECT auth.uid()))) WITH CHECK (is_admin((SELECT auth.uid())));
--   CREATE POLICY system_settings_public_read_maintenance ON public.system_settings FOR SELECT
--     TO anon, authenticated USING (key = 'maintenance_mode');
--
-- Histórico (2026-10-15): esta version se chamava
--   20261015120500_fase3_system_settings_policies_e_remove_probe.sql e também continha
--   DROP POLICY IF EXISTS test_agente2_probe ON public.variant_supplier_sources (1º statement).
--   Tentativa via db-apply-migration.yml, run 38730252412 (~11:52:52–11:54:54 UTC): esse DROP
--   ficou ~2 min esperando AccessExclusiveLock em variant_supplier_sources (tabela quente) e morreu
--   por statement timeout; o lock_timeout passado por PGOPTIONS foi ignorado pelo pooler. Durante a
--   espera, 7 statements de outras sessões foram cancelados por lock timeout. A transação (psql -1)
--   foi revertida inteira: nada mudou no schema e a version NÃO entrou no ledger (conferido
--   read-only em pg_policies e schema_migrations). Por isso o risco foi separado: o DROP da probe
--   foi para 20261015130000_remove_test_agente2_probe.sql e esta version (nunca aplicada, mesmo
--   número) ficou só com system_settings, mais SET LOCAL lock_timeout como 1º statement.
--
-- Origem: seção 7 do antigo 20261013141300_fase3_rls_performance.sql
--   git show 1b59d0f:supabase/migrations/20261013141300_fase3_rls_performance.sql
--
-- CORREÇÃO em relação à seção 7 original: ela criava UMA policy de SELECT "TO anon, authenticated"
-- com is_admin(auth.uid()). is_admin -> is_supervisor_or_above é SQL inlinável, NÃO é SECURITY
-- DEFINER e lê public.user_roles, onde anon não tem privilégio (REVOKE ALL em
-- 20261013170913_incidente20261013_fase5_permissoes_auditoria). Toda leitura anônima de
-- system_settings (checagem de maintenance_mode) passaria a falhar com
-- "permission denied for table user_roles". Aqui há uma policy de SELECT por role, o que também
-- satisfaz o lint (uma permissiva por role+ação) sem expor anon a user_roles.
--
-- Semântica preservada (estado vivo conferido em 2026-10-15):
--   anon          SELECT: key = 'maintenance_mode'                       (antes: public_read_maintenance)
--   authenticated SELECT: key = 'maintenance_mode' OR is_admin(uid)      (antes: as 2 policies somadas)
--   authenticated INSERT/UPDATE/DELETE: is_admin(uid)                    (antes: admin_all FOR ALL)
--
-- Aplicação: só via .github/workflows/db-apply-migration.yml (REGRA #8 / E15), com aprovação do PO.

-- Falha rápido (1s) se o lock não vier, em vez de enfileirar leitores atrás do AccessExclusiveLock
-- (anon tem statement_timeout de 3s). SET LOCAL vale só para esta transação (psql -1); o pooler
-- ignora lock_timeout via PGOPTIONS (run 38730252412).
SET LOCAL lock_timeout = '1s';

DROP POLICY IF EXISTS system_settings_admin_all ON public.system_settings;
DROP POLICY IF EXISTS system_settings_public_read_maintenance ON public.system_settings;
DROP POLICY IF EXISTS system_settings_anon_select ON public.system_settings;
DROP POLICY IF EXISTS system_settings_authenticated_select ON public.system_settings;
DROP POLICY IF EXISTS system_settings_admin_insert ON public.system_settings;
DROP POLICY IF EXISTS system_settings_admin_update ON public.system_settings;
DROP POLICY IF EXISTS system_settings_admin_delete ON public.system_settings;

CREATE POLICY system_settings_anon_select ON public.system_settings
  FOR SELECT TO anon
  USING (key = 'maintenance_mode');

CREATE POLICY system_settings_authenticated_select ON public.system_settings
  FOR SELECT TO authenticated
  USING (key = 'maintenance_mode' OR is_admin((SELECT auth.uid())));

CREATE POLICY system_settings_admin_insert ON public.system_settings
  FOR INSERT TO authenticated
  WITH CHECK (is_admin((SELECT auth.uid())));

CREATE POLICY system_settings_admin_update ON public.system_settings
  FOR UPDATE TO authenticated
  USING (is_admin((SELECT auth.uid())))
  WITH CHECK (is_admin((SELECT auth.uid())));

CREATE POLICY system_settings_admin_delete ON public.system_settings
  FOR DELETE TO authenticated
  USING (is_admin((SELECT auth.uid())));
