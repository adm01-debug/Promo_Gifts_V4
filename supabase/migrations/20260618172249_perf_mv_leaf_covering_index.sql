
-- MELHORIA 3 (2026-06-18): Covering index para eliminar heap fetch no JOIN
-- Atual: Index Scan on mv_product_leaf_category_pk → busca heap para os campos extras
-- Fix: INCLUDE dos 4 campos retornados → Index-Only Scan (zero heap access)

DROP INDEX IF EXISTS mv_product_leaf_category_pk;

CREATE UNIQUE INDEX mv_product_leaf_category_pk
  ON public.mv_product_leaf_category (product_id)
  INCLUDE (leaf_category_id, leaf_category_name, leaf_category_level, leaf_category_slug);

COMMENT ON INDEX mv_product_leaf_category_pk IS
'Covering index: INCLUDE dos 4 campos leaf evita heap fetch nas queries de catálogo.
 Esperado: Index-Only Scan em vez de Index Scan para v_products_public JOIN.';
;
