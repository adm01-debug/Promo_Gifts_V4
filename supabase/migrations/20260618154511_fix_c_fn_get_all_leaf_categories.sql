
-- FIX BUG-C (2026-06-18): RPC para retornar todas as categorias-folha sem max_rows cap
-- Substitui as batched GETs a product_category_assignments (URLs > 11 KB)
CREATE OR REPLACE FUNCTION public.fn_get_all_leaf_categories()
RETURNS TABLE (
  product_id              UUID,
  leaf_category_id        UUID,
  leaf_category_name      TEXT,
  leaf_category_level     INTEGER,
  leaf_category_parent_id UUID,
  leaf_category_slug      TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    product_id,
    leaf_category_id,
    leaf_category_name,
    leaf_category_level,
    leaf_category_parent_id,
    leaf_category_slug
  FROM public.mv_product_leaf_category;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_all_leaf_categories() TO anon, authenticated;

COMMENT ON FUNCTION public.fn_get_all_leaf_categories() IS
'Retorna TODAS as categorias-folha (7 574 linhas) da mv_product_leaf_category sem paginação.
 Criada em 2026-06-18 para fix BUG-C: useProductLeafCategories disparava batched GETs
 com URLs > 11 KB + wave queries de categories. Esta função retorna tudo numa única chamada
 que o frontend armazena em cache por toda a sessão (gcTime = Infinity).';

-- Validação inline
SELECT COUNT(*) AS rpc_rows FROM fn_get_all_leaf_categories();
;
