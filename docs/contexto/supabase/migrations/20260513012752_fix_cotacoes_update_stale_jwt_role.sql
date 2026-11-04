-- cotacoes UPDATE: Replace stale current_user_role() (reads from JWT metadata, can be stale)
-- with is_supervisor_or_above() (reads from user_roles table, always fresh)

DROP POLICY IF EXISTS "cotacoes_update_owner_or_admin" ON public.cotacoes;

CREATE POLICY "cotacoes_update_owner_or_supervisor" ON public.cotacoes
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_supervisor_or_above((SELECT auth.uid()))
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.is_supervisor_or_above((SELECT auth.uid()))
  );
