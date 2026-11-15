-- Rollback para 20261108235500_restrict_art_files_public_read_to_quotes.sql
-- Restaura a política original de leitura pública total do bucket art-files

DROP POLICY IF EXISTS "art_files_quotes_public_read" ON storage.objects;
DROP POLICY IF EXISTS "art_files_auth_read" ON storage.objects;

CREATE POLICY "art_files_public_read"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'art-files'
  AND name IS NOT NULL
  AND length(name) > 0
);
