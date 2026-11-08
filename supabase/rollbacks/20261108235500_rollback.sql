-- Rollback da migration 20261108235500_restrict_art_files_public_read_to_quotes.sql
-- Restaura a política pública original (todos os paths de art-files)

DROP POLICY IF EXISTS "art_files_quotes_public_read" ON storage.objects;

CREATE POLICY "art_files_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'art-files');
