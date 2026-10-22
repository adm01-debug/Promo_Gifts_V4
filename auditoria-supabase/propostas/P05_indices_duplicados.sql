-- P05: Remover índices duplicados
-- Achado: I8 (MÉDIO) — 19 conjuntos de índices duplicados
-- NÃO APLICAR DIRETAMENTE — usar workflow db-apply-migration.yml
-- CUIDADO: Verificar queries em produção antes de dropar qualquer índice.
--
-- IMPACTO POSITIVO: Reduz overhead em INSERT/UPDATE/DELETE e espaço em disco.
-- RISCO: Se alguma query depende de hint de índice específico (raro no PG).

-- Verificar índices duplicados antes de dropar:
/*
SELECT t.relname AS tabela, ix.indkey::text AS colunas_idx,
       array_agg(i.relname ORDER BY i.relname) AS indices
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public' AND t.relkind = 'r'
GROUP BY t.relname, ix.indkey::text
HAVING COUNT(*) > 1
ORDER BY t.relname;
*/

-- === CASOS PRIORITÁRIOS ===

-- 1. user_roles: PK + unique index redundante
-- user_roles_pkey já garante unicidade de (user_id, role).
-- idx_user_roles_user_id_role é redundante.
/*
DROP INDEX CONCURRENTLY IF EXISTS idx_user_roles_user_id_role;
*/

-- 2. webhook_delivery_locks: PK + unique index
/*
DROP INDEX CONCURRENTLY IF EXISTS idx_webhook_deliveries_hash;
*/

-- 3. products: slug — dois índices na mesma coluna
-- Verificar qual é o parcial (apenas active=true) antes de dropar:
/*
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'products'
  AND indexname IN ('idx_products_slug_active_lookup', 'idx_products_slug_unique');
-- Se idx_products_slug_unique não for parcial e idx_products_slug_active_lookup for:
-- manter o parcial (mais específico) e dropar o geral, ou vice-versa dependendo de queries.
*/

-- === VERIFICAÇÃO ===
/*
-- Verificar uso de índices antes de dropar:
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE tablename IN ('user_roles', 'webhook_delivery_locks', 'products')
  AND indexname IN ('idx_user_roles_user_id_role', 'idx_webhook_deliveries_hash',
                    'idx_products_slug_active_lookup', 'idx_products_slug_unique');
-- idx_scan = 0 indica índice nunca usado — seguro dropar.
*/

-- === ROLLBACK ===
-- Recriar índices dropados:
/*
CREATE UNIQUE INDEX CONCURRENTLY idx_user_roles_user_id_role
  ON user_roles (user_id, role);
*/
