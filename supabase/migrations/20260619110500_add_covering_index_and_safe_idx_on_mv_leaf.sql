
-- FIX: adicionar índices ausentes que foram perdidos após re-aplicação da git migration
-- A migration 20260618205528_mv_product_leaf_category_level_first.sql cria apenas 2 índices simples.
-- Esta migration adiciona o covering index (para Index Only Scan) e o safe_idx.

-- Remover o índice simples sem INCLUDE (será substituído pelo covering)
DROP INDEX IF EXISTS idx_mv_product_leaf_category_product_id;

-- Covering index: UNIQUE em product_id + INCLUDE dos 4 campos mais consultados
-- Benefício: Index Only Scan no JOIN de v_products_public (zero heap access)
CREATE UNIQUE INDEX idx_mv_product_leaf_category_product_id
  ON public.mv_product_leaf_category (product_id)
  INCLUDE (leaf_category_id, leaf_category_name, leaf_category_level,
           leaf_category_slug, leaf_category_id_safe);

COMMENT ON INDEX idx_mv_product_leaf_category_product_id IS
'Covering index com INCLUDE para Index Only Scan no JOIN de v_products_public.
 Substituiu o índice simples original em 2026-06-19.';

-- Partial index para buscas por leaf_category_id_safe (apenas onde safe não é NULL)
CREATE INDEX IF NOT EXISTS idx_mv_product_leaf_category_safe_id
  ON public.mv_product_leaf_category (leaf_category_id_safe)
  WHERE leaf_category_id_safe IS NOT NULL;

COMMENT ON INDEX idx_mv_product_leaf_category_safe_id IS
'Partial index para buscas por leaf_category_id_safe. Criado em 2026-06-19.';

-- Verificação inline
DO $$
DECLARE
  v_unique_count int;
  v_covering_cols int;
BEGIN
  SELECT COUNT(*) INTO v_unique_count
  FROM pg_index ix JOIN pg_class c ON c.oid=ix.indexrelid
  WHERE c.relname='idx_mv_product_leaf_category_product_id' AND ix.indisunique;

  SELECT COUNT(*) INTO v_covering_cols
  FROM pg_attribute pa JOIN pg_class c ON c.oid=pa.attrelid
  WHERE c.relname='idx_mv_product_leaf_category_product_id' AND pa.attnum > 0;

  IF v_unique_count = 0 THEN RAISE EXCEPTION 'UNIQUE index não criado'; END IF;
  IF v_covering_cols < 6 THEN RAISE EXCEPTION 'INCLUDE cols insuficientes: %', v_covering_cols; END IF;

  RAISE NOTICE 'OK: covering index UNIQUE criado com % colunas (key+include)', v_covering_cols;
END;
$$;
;
