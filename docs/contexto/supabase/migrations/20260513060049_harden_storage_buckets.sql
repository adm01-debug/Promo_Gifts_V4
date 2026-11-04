-- Harden storage bucket policies and add missing upload constraints.

-- ── signatures: restrict SELECT from anon → authenticated only ──────────────
DROP POLICY IF EXISTS "Signatures are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view signatures" ON storage.objects;

CREATE POLICY "Authenticated users can view signatures"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'signatures');

-- ── signatures: add file size and MIME type constraints ──────────────────────
UPDATE storage.buckets
SET
  file_size_limit = 524288,  -- 512 KB
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
WHERE id = 'signatures';

-- ── avatars: add file size and MIME type constraints ────────────────────────
UPDATE storage.buckets
SET
  file_size_limit = 2097152,  -- 2 MB
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
WHERE id = 'avatars' AND (file_size_limit IS NULL OR file_size_limit > 2097152);

-- ── art-files: add file size limit ──────────────────────────────────────────
UPDATE storage.buckets
SET
  file_size_limit = 52428800  -- 50 MB
WHERE id = 'art-files' AND (file_size_limit IS NULL);

-- ── mockup-assets: add file size and MIME type constraints ──────────────────
UPDATE storage.buckets
SET
  file_size_limit = 10485760,  -- 10 MB
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
WHERE id = 'mockup-assets' AND (file_size_limit IS NULL);
