
-- AUDIT 2026-06-17: the `mockup-assets` bucket is declared by migration
-- 20260215185444 but is ABSENT in production (drift). The generate-mockup edge
-- function, mockup-storage.uploadLogoToStorage and approval/OffscreenLayoutCapture
-- all upload to it and call getPublicUrl -> every upload was failing with
-- "Bucket not found". Re-create it (public) + per-user-folder RLS, idempotently.

INSERT INTO storage.buckets (id, name, public)
VALUES ('mockup-assets', 'mockup-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Anyone can view mockup assets') THEN
    CREATE POLICY "Anyone can view mockup assets"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'mockup-assets');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can upload their own mockup assets') THEN
    CREATE POLICY "Users can upload their own mockup assets"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'mockup-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can update their own mockup assets') THEN
    CREATE POLICY "Users can update their own mockup assets"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'mockup-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can delete their own mockup assets') THEN
    CREATE POLICY "Users can delete their own mockup assets"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'mockup-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;
;
