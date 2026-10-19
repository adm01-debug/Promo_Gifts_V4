-- E042 lote 2: Corrigir policies roles={public} para {authenticated}
-- Tabelas: ai_usage_quotas, art_file_attachments, kit_collaborators
-- Estas tabelas já exigem auth.uid() / is_dev() / is_kit_owner() em toda qual/with_check.
-- A migration E042 lote 1 (20261018000042) cobre outras 9 tabelas.
-- Rollback: recriar as policies com TO public usando os mesmos DROP POLICY IF EXISTS / CREATE POLICY

-- ai_usage_quotas (4 policies)
DROP POLICY IF EXISTS "ai_usage_quotas_admin_delete" ON public.ai_usage_quotas;
CREATE POLICY "ai_usage_quotas_admin_delete"
  ON public.ai_usage_quotas FOR DELETE TO authenticated
  USING (is_dev() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "ai_usage_quotas_admin_insert" ON public.ai_usage_quotas;
CREATE POLICY "ai_usage_quotas_admin_insert"
  ON public.ai_usage_quotas FOR INSERT TO authenticated
  WITH CHECK (is_dev() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "ai_usage_quotas_admin_update" ON public.ai_usage_quotas;
CREATE POLICY "ai_usage_quotas_admin_update"
  ON public.ai_usage_quotas FOR UPDATE TO authenticated
  USING (is_dev() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "ai_usage_quotas_read_authenticated" ON public.ai_usage_quotas;
CREATE POLICY "ai_usage_quotas_read_authenticated"
  ON public.ai_usage_quotas FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- art_file_attachments (4 policies)
DROP POLICY IF EXISTS "Users delete own art files" ON public.art_file_attachments;
CREATE POLICY "Users delete own art files"
  ON public.art_file_attachments FOR DELETE TO authenticated
  USING ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Users insert own art files" ON public.art_file_attachments;
CREATE POLICY "Users insert own art files"
  ON public.art_file_attachments FOR INSERT TO authenticated
  WITH CHECK ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Users update own art files" ON public.art_file_attachments;
CREATE POLICY "Users update own art files"
  ON public.art_file_attachments FOR UPDATE TO authenticated
  USING ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Users view own art files" ON public.art_file_attachments;
CREATE POLICY "Users view own art files"
  ON public.art_file_attachments FOR SELECT TO authenticated
  USING ((user_id = auth.uid()));

-- kit_collaborators (4 policies)
-- is_kit_owner(_kit_id uuid, _user_id uuid) requer 2 args — baseline linha 61114
DROP POLICY IF EXISTS "Owner can invite collaborators" ON public.kit_collaborators;
CREATE POLICY "Owner can invite collaborators"
  ON public.kit_collaborators FOR INSERT TO authenticated
  WITH CHECK (is_kit_owner(kit_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "Owner can remove collaborators" ON public.kit_collaborators;
CREATE POLICY "Owner can remove collaborators"
  ON public.kit_collaborators FOR DELETE TO authenticated
  USING (is_kit_owner(kit_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "Owner can update collaborators" ON public.kit_collaborators;
CREATE POLICY "Owner can update collaborators"
  ON public.kit_collaborators FOR UPDATE TO authenticated
  USING (is_kit_owner(kit_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "View collaborators if owner or self" ON public.kit_collaborators;
CREATE POLICY "View collaborators if owner or self"
  ON public.kit_collaborators FOR SELECT TO authenticated
  USING ((is_kit_owner(kit_id, (SELECT auth.uid())) OR (user_id = auth.uid())));

