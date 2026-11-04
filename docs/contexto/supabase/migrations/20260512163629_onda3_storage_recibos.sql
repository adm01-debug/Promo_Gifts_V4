-- ============================================================
--  Storage bucket pra recibos de entrega
--  Padrão: cotacoes/{cotacao_id}/recibo.jpg
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recibos-entrega',
  'recibos-entrega',
  true,                           -- público (qualquer um com link vê)
  10 * 1024 * 1024,               -- 10 MB max por arquivo
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO UPDATE 
SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies de Storage
DROP POLICY IF EXISTS "recibos_public_read" ON storage.objects;
CREATE POLICY "recibos_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'recibos-entrega');

DROP POLICY IF EXISTS "recibos_authenticated_write" ON storage.objects;
CREATE POLICY "recibos_authenticated_write"
  ON storage.objects FOR INSERT
  TO authenticated, service_role
  WITH CHECK (bucket_id = 'recibos-entrega');

DROP POLICY IF EXISTS "recibos_authenticated_update" ON storage.objects;
CREATE POLICY "recibos_authenticated_update"
  ON storage.objects FOR UPDATE
  TO authenticated, service_role
  USING (bucket_id = 'recibos-entrega');
