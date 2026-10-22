-- P07: Adicionar WITH CHECK à política UPDATE de recibos-entrega
-- Achado: ST-003 (MÉDIO)
-- NÃO APLICAR DIRETAMENTE — usar workflow db-apply-migration.yml
--
-- PROBLEMA: Política UPDATE no bucket recibos-entrega não tem WITH CHECK.
-- Sem WITH CHECK, um usuário pode fazer UPDATE num objeto de outro usuário
-- se tiver acesso ao path.
--
-- PRÉ-REQUISITO: Identificar o nome exato da política e seu owner field:
/*
SELECT id, bucket_id, name, operation, definition
FROM storage.policies
WHERE bucket_id = 'recibos-entrega'
  AND operation = 'UPDATE';
*/

-- === MIGRATION ===

/*
-- Substituir pelo nome real da política encontrado acima:
DELETE FROM storage.policies
WHERE bucket_id = 'recibos-entrega'
  AND operation = 'UPDATE';

-- Recriar com WITH CHECK adequado:
-- Ajustar o campo 'owner' para o campo real usado na tabela de storage objects
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'recibos-entrega-update-owner',
  'recibos-entrega',
  'UPDATE',
  '{
    "role": "authenticated",
    "check": "(owner = auth.uid()::text)",
    "using": "(owner = auth.uid()::text)"
  }'
);
*/

-- === VERIFICAÇÃO ===
/*
SELECT id, name, operation, definition
FROM storage.policies
WHERE bucket_id = 'recibos-entrega';
-- Confirmar que a política UPDATE tem tanto 'using' quanto 'check' com owner = auth.uid()
*/

-- === ROLLBACK ===
/*
DELETE FROM storage.policies
WHERE bucket_id = 'recibos-entrega'
  AND name = 'recibos-entrega-update-owner';
-- Recriar a política original sem WITH CHECK
*/
