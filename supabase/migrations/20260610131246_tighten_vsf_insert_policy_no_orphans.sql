-- Endurece a política de insert: exige user_id = auth.uid() (sem linhas órfãs).
DROP POLICY IF EXISTS vsf_insert_authenticated ON public.visual_search_feedback;
CREATE POLICY vsf_insert_authenticated ON public.visual_search_feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));;
