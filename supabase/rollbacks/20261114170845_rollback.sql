-- Rollback: 20261114170845_fix_workspace_notifications_insert_policy_reapply
-- Volta à policy fraca de 20260622143055 (WITH CHECK (auth.uid() IS NOT NULL AND user_id IS NOT NULL)).

DROP POLICY IF EXISTS "Authenticated can insert own notifications" ON public.workspace_notifications;

CREATE POLICY "Authenticated can insert notifications for valid users"
ON public.workspace_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id IS NOT NULL
);

NOTIFY pgrst, 'reload schema';
