-- Rollback de E042 lote 2: reverte policies de authenticated → public
-- Desfaz as 3 tabelas cobertas por 20261018000043_e042_lote2_ai_art_kits.sql

-- ai_usage_quotas
DROP POLICY IF EXISTS "ai_usage_quotas_admin_delete" ON public.ai_usage_quotas;
CREATE POLICY "ai_usage_quotas_admin_delete"
  ON public.ai_usage_quotas FOR DELETE TO public
  USING (is_dev() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "ai_usage_quotas_admin_insert" ON public.ai_usage_quotas;
CREATE POLICY "ai_usage_quotas_admin_insert"
  ON public.ai_usage_quotas FOR INSERT TO public
  WITH CHECK (is_dev() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "ai_usage_quotas_admin_update" ON public.ai_usage_quotas;
CREATE POLICY "ai_usage_quotas_admin_update"
  ON public.ai_usage_quotas FOR UPDATE TO public
  USING (is_dev() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "ai_usage_quotas_read_authenticated" ON public.ai_usage_quotas;
CREATE POLICY "ai_usage_quotas_read_authenticated"
  ON public.ai_usage_quotas FOR SELECT TO public
  USING (auth.uid() IS NOT NULL);

-- art_file_attachments
DROP POLICY IF EXISTS "Users delete own art files" ON public.art_file_attachments;
CREATE POLICY "Users delete own art files"
  ON public.art_file_attachments FOR DELETE TO public
  USING ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Users insert own art files" ON public.art_file_attachments;
CREATE POLICY "Users insert own art files"
  ON public.art_file_attachments FOR INSERT TO public
  WITH CHECK ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Users update own art files" ON public.art_file_attachments;
CREATE POLICY "Users update own art files"
  ON public.art_file_attachments FOR UPDATE TO public
  USING ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Users view own art files" ON public.art_file_attachments;
CREATE POLICY "Users view own art files"
  ON public.art_file_attachments FOR SELECT TO public
  USING ((user_id = auth.uid()));

-- kit_collaborators
DROP POLICY IF EXISTS "Owner can invite collaborators" ON public.kit_collaborators;
CREATE POLICY "Owner can invite collaborators"
  ON public.kit_collaborators FOR INSERT TO public
  WITH CHECK (is_kit_owner(kit_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "Owner can remove collaborators" ON public.kit_collaborators;
CREATE POLICY "Owner can remove collaborators"
  ON public.kit_collaborators FOR DELETE TO public
  USING (is_kit_owner(kit_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "Owner can update collaborators" ON public.kit_collaborators;
CREATE POLICY "Owner can update collaborators"
  ON public.kit_collaborators FOR UPDATE TO public
  USING (is_kit_owner(kit_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "View collaborators if owner or self" ON public.kit_collaborators;
CREATE POLICY "View collaborators if owner or self"
  ON public.kit_collaborators FOR SELECT TO public
  USING ((is_kit_owner(kit_id, (SELECT auth.uid())) OR (user_id = auth.uid())));
