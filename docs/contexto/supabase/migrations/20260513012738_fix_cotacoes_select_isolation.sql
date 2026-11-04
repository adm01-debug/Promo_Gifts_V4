-- CRÍTICO-003: Fix cotacoes SELECT isolation
-- Replace "true" policy that exposed all quotes to all authenticated users
-- with per-user isolation (agents see own; supervisors+ see all)

DROP POLICY IF EXISTS "cotacoes_select_authenticated" ON public.cotacoes;

CREATE POLICY "cotacoes_select_own_or_supervisor" ON public.cotacoes
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_supervisor_or_above((SELECT auth.uid()))
  );
