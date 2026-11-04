-- Fix role_permissions write policies: role was 'public' instead of 'authenticated'
-- This makes the policies explicit and prevents anonymous access attempts

DROP POLICY IF EXISTS "role_permissions_dev_delete" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_dev_insert" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_dev_update" ON public.role_permissions;

CREATE POLICY "role_permissions_dev_insert" ON public.role_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_dev((SELECT auth.uid())));

CREATE POLICY "role_permissions_dev_update" ON public.role_permissions
  FOR UPDATE
  TO authenticated
  USING (public.is_dev((SELECT auth.uid())))
  WITH CHECK (public.is_dev((SELECT auth.uid())));

CREATE POLICY "role_permissions_dev_delete" ON public.role_permissions
  FOR DELETE
  TO authenticated
  USING (public.is_dev((SELECT auth.uid())));
