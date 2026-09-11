
-- FIX BUG-C/D (2026-06-18): eliminar N+1 de useProductLeafCategories
-- Problema: 500 produtos → 2 GETs com 300/200 UUIDs na cláusula IN (URLs > 11 KB)
-- + "wave queries" adicionais para categories (até 10 rounds adicionais)
-- Solução: MV pré-computa a categoria-folha por produto → uma chamada RPC retorna tudo

-- ① Índice auxiliar (não-parcial) em product_category_assignments.product_id
-- O único existente é parcial (WHERE is_primary=true) e não serve para ORDER BY folha.
CREATE INDEX IF NOT EXISTS idx_pca_product_id_noncovering
  ON public.product_category_assignments (product_id);

-- ② Materialized view: uma linha por produto com a categoria mais profunda
-- Desempate: level DESC → is_primary DESC → display_order ASC → name ASC
-- (espelha a lógica do pickLeaves() em useProductLeafCategories.tsx)
CREATE MATERIALIZED VIEW public.mv_product_leaf_category AS
SELECT DISTINCT ON (pca.product_id)
  pca.product_id,
  c.id            AS leaf_category_id,
  c.name          AS leaf_category_name,
  c.level         AS leaf_category_level,
  c.parent_id     AS leaf_category_parent_id,
  c.slug          AS leaf_category_slug
FROM public.product_category_assignments pca
JOIN public.categories c ON c.id = pca.category_id
ORDER BY
  pca.product_id,
  c.level            DESC NULLS LAST,
  pca.is_primary     DESC NULLS LAST,
  pca.display_order  ASC  NULLS LAST,
  c.name             ASC;

-- ③ Índice único obrigatório para REFRESH CONCURRENTLY no futuro
CREATE UNIQUE INDEX mv_product_leaf_category_pk
  ON public.mv_product_leaf_category (product_id);

-- ④ Índice em leaf_category_id para JOINs em v_products_public
CREATE INDEX mv_product_leaf_category_cat_idx
  ON public.mv_product_leaf_category (leaf_category_id);

-- ⑤ Permissões de leitura para anon/authenticated
GRANT SELECT ON public.mv_product_leaf_category TO anon, authenticated;

COMMENT ON MATERIALIZED VIEW public.mv_product_leaf_category IS
'Pré-computa a categoria-folha (mais profunda) de cada produto via product_category_assignments.
 Criada em 2026-06-18 para fix BUG-C: useProductLeafCategories disparava 2+ batched GETs
 com URLs > 11 KB (300 UUIDs em IN clause) + wave queries para categories.
 Refresh: executar REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_product_leaf_category
 após bulk import de categories ou product_category_assignments.';
;
