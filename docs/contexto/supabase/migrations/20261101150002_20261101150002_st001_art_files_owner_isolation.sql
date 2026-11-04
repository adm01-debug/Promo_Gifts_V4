ALTER POLICY "art_files_auth_delete" ON storage.objects
  USING (bucket_id = 'art-files' AND owner = (SELECT auth.uid()));

ALTER POLICY "art_files_auth_update" ON storage.objects
  USING (bucket_id = 'art-files' AND owner = (SELECT auth.uid()))
  WITH CHECK (bucket_id = 'art-files' AND owner = (SELECT auth.uid()));

ALTER POLICY "art_files_auth_insert" ON storage.objects
  WITH CHECK (bucket_id = 'art-files' AND owner = (SELECT auth.uid()));
