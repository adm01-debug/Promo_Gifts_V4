ALTER POLICY ai_usage_quotas_admin_delete ON public.ai_usage_quotas
  USING (is_dev() OR has_role((SELECT auth.uid()), 'admin'::app_role));

ALTER POLICY ai_usage_quotas_admin_insert ON public.ai_usage_quotas
  WITH CHECK (is_dev() OR has_role((SELECT auth.uid()), 'admin'::app_role));

ALTER POLICY ai_usage_quotas_admin_update ON public.ai_usage_quotas
  USING (is_dev() OR has_role((SELECT auth.uid()), 'admin'::app_role))
  WITH CHECK (is_dev() OR has_role((SELECT auth.uid()), 'admin'::app_role));

ALTER POLICY ai_usage_quotas_read_authenticated ON public.ai_usage_quotas
  USING ((SELECT auth.uid()) IS NOT NULL);

ALTER POLICY "Users delete own art files" ON public.art_file_attachments
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY "Users insert own art files" ON public.art_file_attachments
  WITH CHECK (user_id = (SELECT auth.uid()));

ALTER POLICY "Users update own art files" ON public.art_file_attachments
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

ALTER POLICY "Users view own art files" ON public.art_file_attachments
  USING (user_id = (SELECT auth.uid()));
