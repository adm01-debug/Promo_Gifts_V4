ALTER POLICY "Admins can read all profiles" ON public.profiles
  USING (is_admin_or_above((SELECT auth.uid())));
