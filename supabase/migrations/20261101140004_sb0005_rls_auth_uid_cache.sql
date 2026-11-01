-- SB-0005: Substitui auth.uid() por (SELECT auth.uid()) em 8 policies com auth_rls_initplan
-- Severidade: MÉDIO | Tipo: PERFORMANCE
-- Evidência: get_advisors(performance) → 8 entradas tipo "auth_rls_initplan"
--   ai_usage_quotas: admin_delete, admin_insert, admin_update, read_authenticated
--   art_file_attachments: delete/insert/update/view own
-- Impacto: auth.uid() chamado como função volátil por linha, sem cache do planner.
-- Risco de regressão: baixo — comportamento idêntico, só muda o plano de execução.

-- ============================================================
-- ai_usage_quotas (4 policies)
-- ============================================================

DROP POLICY IF EXISTS ai_usage_quotas_admin_delete ON public.ai_usage_quotas;
CREATE POLICY ai_usage_quotas_admin_delete
  ON public.ai_usage_quotas
  FOR DELETE
  TO authenticated
  USING (is_dev() OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS ai_usage_quotas_admin_insert ON public.ai_usage_quotas;
CREATE POLICY ai_usage_quotas_admin_insert
  ON public.ai_usage_quotas
  FOR INSERT
  TO authenticated
  WITH CHECK (is_dev() OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS ai_usage_quotas_admin_update ON public.ai_usage_quotas;
CREATE POLICY ai_usage_quotas_admin_update
  ON public.ai_usage_quotas
  FOR UPDATE
  TO authenticated
  USING (is_dev() OR has_role((SELECT auth.uid()), 'admin'::app_role))
  WITH CHECK (is_dev() OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS ai_usage_quotas_read_authenticated ON public.ai_usage_quotas;
CREATE POLICY ai_usage_quotas_read_authenticated
  ON public.ai_usage_quotas
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- ============================================================
-- art_file_attachments (4 policies)
-- ============================================================

DROP POLICY IF EXISTS "Users delete own art files" ON public.art_file_attachments;
CREATE POLICY "Users delete own art files"
  ON public.art_file_attachments
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users insert own art files" ON public.art_file_attachments;
CREATE POLICY "Users insert own art files"
  ON public.art_file_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users update own art files" ON public.art_file_attachments;
CREATE POLICY "Users update own art files"
  ON public.art_file_attachments
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users view own art files" ON public.art_file_attachments;
CREATE POLICY "Users view own art files"
  ON public.art_file_attachments
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ROLLBACK:
-- Reverter cada policy trocando (SELECT auth.uid()) de volta para auth.uid().
-- Comportamento idêntico — sem perda de acesso.
