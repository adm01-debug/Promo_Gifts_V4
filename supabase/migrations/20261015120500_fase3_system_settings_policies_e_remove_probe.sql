-- Pendência do incidente 2026-10-13 (Agente 2, fase 3), nunca aplicada em produção:
--   1. remove a policy de teste test_agente2_probe (SELECT USING (false), sem efeito funcional);
--   2. resolve o lint multiple_permissive_policies em system_settings.
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
--
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
--   (test_agente2_probe não precisa voltar: não tinha efeito.)

DROP POLICY IF EXISTS test_agente2_probe ON public.variant_supplier_sources;

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
