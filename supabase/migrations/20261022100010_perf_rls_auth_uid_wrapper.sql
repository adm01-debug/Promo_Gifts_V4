-- ADV-PERF-001: Wrap auth.uid() calls in (SELECT ...) to avoid per-row evaluation
-- Impact: 447 policies affected total; this batch covers 50 (ordered by tablename, policyname)
-- Estimated improvement: 10-40% on authenticated reads on tables with many rows
-- Apply via: .github/workflows/db-apply-migration.yml
--
-- Transformation applied to each expression:
--   ( SELECT ( SELECT auth.uid() AS uid) AS uid)  →  (SELECT auth.uid())
--   ( SELECT auth.uid() AS uid)                   →  (SELECT auth.uid())
--   auth.uid()  (bare)                            →  (SELECT auth.uid())
--
-- Why this matters: bare auth.uid() (or nested-SELECT variants that are not the canonical
-- (SELECT auth.uid()) form) cause PostgreSQL to re-evaluate the function for every row
-- scanned during RLS enforcement. With (SELECT auth.uid()), PostgreSQL promotes the call
-- to an InitPlan, evaluates it once per query, and uses the cached value for all row checks.

BEGIN;

-- ─── Archive / Backup tables (admin_only policies) ──────────────────────────

ALTER POLICY "admin_only" ON "_archive_product_ai_20260626"
  USING (is_admin_or_above((SELECT auth.uid())))
  WITH CHECK (is_admin_or_above((SELECT auth.uid())));

ALTER POLICY "admin_only" ON "_archive_product_seo_20260626"
  USING (is_admin_or_above((SELECT auth.uid())))
  WITH CHECK (is_admin_or_above((SELECT auth.uid())));

ALTER POLICY "admin_only" ON "_archive_supplier_price_tiers_20260626"
  USING (is_admin_or_above((SELECT auth.uid())))
  WITH CHECK (is_admin_or_above((SELECT auth.uid())));

ALTER POLICY "admin_only" ON "_bkp_kcvs_pre_normalize_20260624"
  USING (is_admin_or_above((SELECT auth.uid())))
  WITH CHECK (is_admin_or_above((SELECT auth.uid())));

ALTER POLICY "admin_only" ON "_bkp_kit_color_from_name_20260624"
  USING (is_admin_or_above((SELECT auth.uid())))
  WITH CHECK (is_admin_or_above((SELECT auth.uid())));

ALTER POLICY "admin_only" ON "_bkp_kit_packing_type_20260624"
  USING (is_admin_or_above((SELECT auth.uid())))
  WITH CHECK (is_admin_or_above((SELECT auth.uid())));

ALTER POLICY "admin_only" ON "_bkp_kit_pkg_material_20260624"
  USING (is_admin_or_above((SELECT auth.uid())))
  WITH CHECK (is_admin_or_above((SELECT auth.uid())));

ALTER POLICY "admin_only" ON "_qa_pct_results"
  USING (is_admin_or_above((SELECT auth.uid())))
  WITH CHECK (is_admin_or_above((SELECT auth.uid())));

-- ─── access_blocked_log ──────────────────────────────────────────────────────

ALTER POLICY "access_blocked_log_admin_insert" ON "access_blocked_log"
  WITH CHECK (is_admin_or_above((SELECT auth.uid())));

ALTER POLICY "access_blocked_log_admin_read" ON "access_blocked_log"
  USING (is_admin_or_above((SELECT auth.uid())));

-- ─── access_security_settings ────────────────────────────────────────────────

ALTER POLICY "Admins e Devs podem atualizar configurações de segurança" ON "access_security_settings"
  USING ((has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'dev'::app_role)))
  WITH CHECK ((has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'dev'::app_role)));

ALTER POLICY "Admins e Devs podem visualizar configurações de segurança" ON "access_security_settings"
  USING ((has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'dev'::app_role)));

-- ─── admin_audit_log ─────────────────────────────────────────────────────────

ALTER POLICY "Admins or above can insert audit entries" ON "admin_audit_log"
  WITH CHECK ((is_admin_or_above((SELECT auth.uid())) AND (user_id = (SELECT auth.uid()))));

ALTER POLICY "Devs can read audit logs" ON "admin_audit_log"
  USING (can_view_audit_logs((SELECT auth.uid())));

-- ─── admin_settings ──────────────────────────────────────────────────────────

ALTER POLICY "Admins can insert admin_settings" ON "admin_settings"
  WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

ALTER POLICY "Admins can update admin_settings" ON "admin_settings"
  USING (has_role((SELECT auth.uid()), 'admin'::app_role))
  WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

ALTER POLICY "Admins can view admin_settings" ON "admin_settings"
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- ─── ai_enrichment_queue ─────────────────────────────────────────────────────

ALTER POLICY "ai_queue_select_dynamic" ON "ai_enrichment_queue"
  USING ((is_admin_or_above((SELECT auth.uid())) OR (organization_id IN (
    SELECT user_organizations.organization_id
    FROM user_organizations
    WHERE (user_organizations.user_id = (SELECT auth.uid()))
  ))));

-- ─── ai_routing_decisions ────────────────────────────────────────────────────

ALTER POLICY "ai_routing_decisions_dev_read" ON "ai_routing_decisions"
  USING ((is_dev() OR has_role((SELECT auth.uid()), 'supervisor'::app_role) OR has_role((SELECT auth.uid()), 'admin'::app_role)));

-- ─── ai_usage_events ─────────────────────────────────────────────────────────

ALTER POLICY "Users can insert their own usage events" ON "ai_usage_events"
  WITH CHECK (((SELECT auth.uid()) = user_id));

ALTER POLICY "Users can view their own usage events" ON "ai_usage_events"
  USING ((((SELECT auth.uid()) = user_id) OR has_role((SELECT auth.uid()), 'admin'::app_role)));

-- ─── ai_usage_logs ───────────────────────────────────────────────────────────

ALTER POLICY "ai_usage_logs_user_own" ON "ai_usage_logs"
  USING ((is_dev() OR has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'supervisor'::app_role) OR (user_id = (SELECT auth.uid()))));

-- ─── ai_usage_quotas ─────────────────────────────────────────────────────────

ALTER POLICY "ai_usage_quotas_admin_delete" ON "ai_usage_quotas"
  USING ((is_dev() OR has_role((SELECT auth.uid()), 'admin'::app_role)));

ALTER POLICY "ai_usage_quotas_admin_insert" ON "ai_usage_quotas"
  WITH CHECK ((is_dev() OR has_role((SELECT auth.uid()), 'admin'::app_role)));

ALTER POLICY "ai_usage_quotas_admin_update" ON "ai_usage_quotas"
  USING ((is_dev() OR has_role((SELECT auth.uid()), 'admin'::app_role)));

ALTER POLICY "ai_usage_quotas_read_authenticated" ON "ai_usage_quotas"
  USING (((SELECT auth.uid()) IS NOT NULL));

-- ─── analytics_events ────────────────────────────────────────────────────────

ALTER POLICY "ae_delete_dev" ON "analytics_events"
  USING (is_dev((SELECT auth.uid())));

ALTER POLICY "ae_insert_self_or_anon" ON "analytics_events"
  WITH CHECK (((user_id IS NULL) OR (user_id = (SELECT auth.uid()))));

ALTER POLICY "ae_select_own_or_coord" ON "analytics_events"
  USING (((user_id = (SELECT auth.uid())) OR is_coord_or_above((SELECT auth.uid()))));

-- ─── anon_catalog_grant_audit_log ────────────────────────────────────────────

ALTER POLICY "anon_catalog_grant_audit_log_admin_read" ON "anon_catalog_grant_audit_log"
  USING (is_admin_or_above((SELECT auth.uid())));

-- ─── art_file_attachments ────────────────────────────────────────────────────

ALTER POLICY "Users delete own art files" ON "art_file_attachments"
  USING ((user_id = (SELECT auth.uid())));

ALTER POLICY "Users insert own art files" ON "art_file_attachments"
  WITH CHECK ((user_id = (SELECT auth.uid())));

ALTER POLICY "Users update own art files" ON "art_file_attachments"
  USING ((user_id = (SELECT auth.uid())));

ALTER POLICY "Users view own art files" ON "art_file_attachments"
  USING ((user_id = (SELECT auth.uid())));

-- ─── attribute_definitions ───────────────────────────────────────────────────

ALTER POLICY "attribute_definitions_delete_policy" ON "attribute_definitions"
  USING ((organization_id IN (
    SELECT attribute_definitions.organization_id
    FROM profiles
    WHERE (profiles.id = (SELECT auth.uid()))
  )));

ALTER POLICY "attribute_definitions_insert_policy" ON "attribute_definitions"
  WITH CHECK ((organization_id IN (
    SELECT attribute_definitions.organization_id
    FROM profiles
    WHERE (profiles.id = (SELECT auth.uid()))
  )));

ALTER POLICY "attribute_definitions_select_policy" ON "attribute_definitions"
  USING ((organization_id IN (
    SELECT attribute_definitions.organization_id
    FROM profiles
    WHERE (profiles.id = (SELECT auth.uid()))
  )));

ALTER POLICY "attribute_definitions_update_policy" ON "attribute_definitions"
  USING ((organization_id IN (
    SELECT attribute_definitions.organization_id
    FROM profiles
    WHERE (profiles.id = (SELECT auth.uid()))
  )));

-- ─── attribute_groups ────────────────────────────────────────────────────────

ALTER POLICY "attribute_groups_delete_policy" ON "attribute_groups"
  USING ((organization_id IN (
    SELECT attribute_groups.organization_id
    FROM profiles
    WHERE (profiles.id = (SELECT auth.uid()))
  )));

ALTER POLICY "attribute_groups_insert_policy" ON "attribute_groups"
  WITH CHECK ((organization_id IN (
    SELECT attribute_groups.organization_id
    FROM profiles
    WHERE (profiles.id = (SELECT auth.uid()))
  )));

ALTER POLICY "attribute_groups_select_policy" ON "attribute_groups"
  USING ((organization_id IN (
    SELECT attribute_groups.organization_id
    FROM profiles
    WHERE (profiles.id = (SELECT auth.uid()))
  )));

ALTER POLICY "attribute_groups_update_policy" ON "attribute_groups"
  USING ((organization_id IN (
    SELECT attribute_groups.organization_id
    FROM profiles
    WHERE (profiles.id = (SELECT auth.uid()))
  )));

-- ─── audit_log ───────────────────────────────────────────────────────────────

ALTER POLICY "audit_log_insert_self" ON "audit_log"
  WITH CHECK (((SELECT auth.uid()) = user_id));

ALTER POLICY "audit_log_select_dev" ON "audit_log"
  USING (can_view_audit_logs((SELECT auth.uid())));

-- ─── audit_log_gravacao ──────────────────────────────────────────────────────

ALTER POLICY "audit_log_gravacao_select_supervisor_or_above" ON "audit_log_gravacao"
  USING (is_supervisor_or_above((SELECT auth.uid())));

-- ─── auto_tag_rules ──────────────────────────────────────────────────────────

ALTER POLICY "atr_admin_insert" ON "auto_tag_rules"
  WITH CHECK (is_admin_or_above((SELECT auth.uid())));

ALTER POLICY "atr_admin_update" ON "auto_tag_rules"
  USING (is_admin_or_above((SELECT auth.uid())))
  WITH CHECK (is_admin_or_above((SELECT auth.uid())));

ALTER POLICY "atr_dev_delete" ON "auto_tag_rules"
  USING (is_dev((SELECT auth.uid())));

-- ─── backup_produto_ramo_atividade_20260625 ───────────────────────────────────

ALTER POLICY "admin_only" ON "backup_produto_ramo_atividade_20260625"
  USING (is_admin_or_above((SELECT auth.uid())))
  WITH CHECK (is_admin_or_above((SELECT auth.uid())));

-- ─── bot_detection_log ───────────────────────────────────────────────────────

ALTER POLICY "Admins can read bot log" ON "bot_detection_log"
  USING (is_admin_or_above((SELECT auth.uid())));

COMMIT;
