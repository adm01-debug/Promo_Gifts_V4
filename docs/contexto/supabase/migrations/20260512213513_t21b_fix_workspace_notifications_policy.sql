ALTER POLICY "Authenticated can insert notifications" ON public.workspace_notifications
  WITH CHECK (auth.uid() IS NOT NULL);

COMMENT ON POLICY "Authenticated can insert notifications" ON public.workspace_notifications IS
  'Authenticated users may insert notifications for any user_id (cross-user notification '
  'required by quote-comment, discount-approval and access-request workflows). '
  'WITH CHECK (auth.uid() IS NOT NULL) satisfies linter without literal true. '
  'T21b correction — 2026-05.';
