-- P04: Corrigir políticas de storage com acesso público indevido
-- Achado: ST-001 (ALTO)
-- NÃO APLICAR DIRETAMENTE — usar workflow db-apply-migration.yml
--
-- PROBLEMA: Buckets art-files e component-media têm public=false
-- mas políticas SELECT com TO public sem filtro de usuário.
-- Qualquer pessoa com a URL pode acessar os arquivos.
--
-- PRÉ-REQUISITO: Verificar nomes exatos das políticas atuais:
--   SELECT id, bucket_id, name, definition FROM storage.policies
--   WHERE bucket_id IN ('art-files', 'component-media');

-- === OPÇÃO A: Restringir a usuários autenticados ===
-- (recomendada se os arquivos não precisam ser públicos)

/*
-- Remover políticas públicas existentes (substituir pelos nomes reais):
DELETE FROM storage.policies
WHERE bucket_id = 'art-files'
  AND definition->>'role' = 'public'
  AND definition->>'operation' = 'SELECT';

DELETE FROM storage.policies
WHERE bucket_id = 'component-media'
  AND definition->>'role' = 'public'
  AND definition->>'operation' = 'SELECT';

-- Criar políticas para usuários autenticados:
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES
  ('art-files-auth-read', 'art-files', 'SELECT',
   '{"role": "authenticated", "check": "auth.uid() IS NOT NULL"}'),
  ('component-media-auth-read', 'component-media', 'SELECT',
   '{"role": "authenticated", "check": "auth.uid() IS NOT NULL"}');
*/

-- === OPÇÃO B: Tornar buckets explicitamente públicos (se leitura pública é intencional) ===
-- Requer aprovação do PO documentada antes de aplicar.

/*
UPDATE storage.buckets
SET public = true
WHERE id IN ('art-files', 'component-media');
*/

-- === VERIFICAÇÃO PÓS-APLICAÇÃO ===
/*
-- Confirmar que acesso não autenticado retorna 401/403:
-- curl -I 'https://doufsxqlfjyuvxuezpln.supabase.co/storage/v1/object/art-files/qualquer-arquivo'
-- Esperado: 401 Unauthorized

SELECT id, public FROM storage.buckets WHERE id IN ('art-files', 'component-media');
SELECT * FROM storage.policies WHERE bucket_id IN ('art-files', 'component-media');
*/

-- === ROLLBACK ===
-- Restaurar política pública (reverter para estado inseguro — não recomendado):
/*
-- Dropar políticas novas e recriar as originais com TO public
*/
