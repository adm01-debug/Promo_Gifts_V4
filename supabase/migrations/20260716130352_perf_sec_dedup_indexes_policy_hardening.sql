-- EXEC-8: Dedup indexes, missing FK indexes, policy consolidation & hardening
--
-- (A) Drop 4 exact duplicate indexes on kit_component tables (same column, no WHERE diff)
-- (B) Create 2 missing FK indexes on magazine_templates + magazines
-- (C) Remove superseded SELECT policy on product_views (was covered by two specific ones)
-- (D) Harden 3 USING(true) ALL policies for `authenticated` on QA/reference tables

-- ─── (A) Drop exact duplicate indexes ────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_kit_component_enrichment_raw_kit_product_id;
DROP INDEX IF EXISTS public.idx_kit_component_enrichment_raw_kit_component_id;
DROP INDEX IF EXISTS public.idx_kit_component_padronizacao_kit_product_id;
DROP INDEX IF EXISTS public.idx_kit_component_padronizacao_kit_component_id;

-- ─── (B) Missing FK indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_magazine_templates_template_id
  ON public.magazine_templates (template_id);

CREATE INDEX IF NOT EXISTS idx_magazines_template_id
  ON public.magazines (template_id);

-- ─── (C) Consolidate product_views SELECT policies ───────────────────────────
DROP POLICY IF EXISTS "Users can view own views" ON public.product_views;

-- ─── (D) Fix USING(true)/WITH CHECK(true) ALL for authenticated role ──────────

-- color_synonym_map
DROP POLICY IF EXISTS rls_authenticated_all_color_synonym_map ON public.color_synonym_map;
CREATE POLICY csm_read_authenticated ON public.color_synonym_map
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY csm_write_admin ON public.color_synonym_map
  FOR ALL TO authenticated
  USING (is_admin_or_above((SELECT auth.uid())))
  WITH CHECK (is_admin_or_above((SELECT auth.uid())));

-- product_qa_image_alerts
DROP POLICY IF EXISTS rls_authenticated_all_qa_alerts ON public.product_qa_image_alerts;
CREATE POLICY qa_alerts_read_authenticated ON public.product_qa_image_alerts
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY qa_alerts_write_admin ON public.product_qa_image_alerts
  FOR ALL TO authenticated
  USING (is_admin_or_above((SELECT auth.uid())))
  WITH CHECK (is_admin_or_above((SELECT auth.uid())));

-- qa_image_coverage_log
DROP POLICY IF EXISTS rls_authenticated_all_qa_coverage_log ON public.qa_image_coverage_log;
CREATE POLICY qa_coverage_read_authenticated ON public.qa_image_coverage_log
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY qa_coverage_write_admin ON public.qa_image_coverage_log
  FOR ALL TO authenticated
  USING (is_admin_or_above((SELECT auth.uid())))
  WITH CHECK (is_admin_or_above((SELECT auth.uid())));
;
