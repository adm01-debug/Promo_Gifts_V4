-- Rollback: supabase/rollbacks/20261108235500_rollback.sql
-- Restringe a política pública do bucket art-files a apenas o path quotes/
-- (PDFs de proposta acessados pelo Bitrix24 CRM sem JWT).
-- A política original {public} em todo o bucket expunha artes de clientes (mockups,
-- logos, layouts) a qualquer usuário anônimo via URL pública — risco de vazamento.
-- Checagem de páginas públicas confirmou que:
--   /revista-publica/:token usa edge magazine-public-view (lê tabelas, não storage)
--   clientLogoUrl vem de magazines.branding JSONB, não de art-files
--   Único consumidor legítimo sem JWT: Bitrix24 CRM lê quotes/<id>/<pdf>

-- Remove a política excessivamente ampla
DROP POLICY IF EXISTS "art_files_public_read" ON storage.objects;

-- Cria política restrita ao path quotes/ (uso legítimo pelo Bitrix24)
CREATE POLICY "art_files_quotes_public_read"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'art-files'
  AND name LIKE 'quotes/%'
);
