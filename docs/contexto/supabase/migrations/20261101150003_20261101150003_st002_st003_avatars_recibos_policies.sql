ALTER POLICY "avatars_auth_delete" ON storage.objects
  USING (bucket_id = 'avatars' AND owner = (SELECT auth.uid()));

ALTER POLICY "avatars_auth_update" ON storage.objects
  USING (bucket_id = 'avatars' AND owner = (SELECT auth.uid()))
  WITH CHECK (bucket_id = 'avatars' AND owner = (SELECT auth.uid()));

ALTER POLICY "recibos_authenticated_update" ON storage.objects
  WITH CHECK (bucket_id = 'recibos-entrega');
