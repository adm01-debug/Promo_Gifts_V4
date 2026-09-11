-- ═══════════════════════════════════════════════════════════════════
-- R4 · Linhagem Silver→Gold rastreável: products.padronizacao_id
-- fix_version: silver_gold_link_20260627
--
-- Antes: traceabilidade só existia na direção Silver→Gold
--        (produtos_padronizacao.product_id = products.id)
-- Depois: bidirecional — Gold também aponta para seu Silver canônico.
-- Silver canônico = registro com promoted_at mais recente (para Gold
-- com múltiplos Silver de fornecedores diferentes).
-- FK ON DELETE SET NULL: se Silver removido, Gold sobrevive.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Adicionar coluna
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS padronizacao_id uuid
    REFERENCES produtos_padronizacao(id) ON DELETE SET NULL;

COMMENT ON COLUMN products.padronizacao_id IS
'[fix_version:silver_gold_link_20260627] FK para o registro Silver canônico (produtos_padronizacao)
 que originou este produto Gold. Populado pelo medallion promote tick.
 NULL = produto criado manualmente sem origem Silver.
 ON DELETE SET NULL: remoção do Silver não quebra o Gold.
 Para produtos com múltiplos Silver (multi-fornecedor), aponta para o Silver
 com promoted_at mais recente.';

-- 2. Índice na FK (evita SeqScan em products ao fazer JOIN com Silver)
CREATE INDEX IF NOT EXISTS idx_products_padronizacao_id
  ON products(padronizacao_id)
  WHERE padronizacao_id IS NOT NULL;

-- 3. Backfill: Silver canônico por produto (promoted_at DESC NULLS LAST)
WITH canonical AS (
  SELECT DISTINCT ON (product_id)
    id        AS silver_id,
    product_id
  FROM produtos_padronizacao
  WHERE product_id IS NOT NULL
  ORDER BY product_id, promoted_at DESC NULLS LAST, created_at DESC NULLS LAST
)
UPDATE products p
SET padronizacao_id = c.silver_id
FROM canonical c
WHERE c.product_id = p.id
  AND p.padronizacao_id IS NULL;;
