
-- Substitui get_catalog_bestseller_ids (retornava ids -> .in() gerava URL gigante no front)
-- por get_catalog_bestseller_page que retorna as próprias linhas da view (1 chamada, sem .in()).
DROP FUNCTION IF EXISTS public.get_catalog_bestseller_ids(text,int,int);

CREATE OR REPLACE FUNCTION public.get_catalog_bestseller_page(
  p_sort text DEFAULT 'best-seller-supplier',
  p_limit int DEFAULT 500,
  p_offset int DEFAULT 0
)
RETURNS SETOF public.v_products_public
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $fn$
  SELECT v.*
  FROM public.v_products_public v
  LEFT JOIN mv_product_intelligence mi ON mi.product_id = v.id
  LEFT JOIN (
    SELECT qi.product_id AS pid, sum(COALESCE(qi.quantity,1)) AS promo_qty
    FROM quote_items qi WHERE qi.product_id IS NOT NULL GROUP BY qi.product_id
  ) qs ON qs.pid = v.id
  WHERE v.active = true
  ORDER BY
    CASE WHEN p_sort = 'best-seller-promo'    THEN COALESCE(qs.promo_qty, 0) END DESC NULLS LAST,
    CASE WHEN p_sort = 'best-seller-supplier' THEN COALESCE(mi.turnover_score, 0) END DESC NULLS LAST,
    v.name ASC, v.id ASC
  LIMIT GREATEST(p_limit,0) OFFSET GREATEST(p_offset,0);
$fn$;

COMMENT ON FUNCTION public.get_catalog_bestseller_page(text,int,int) IS
  'Auditoria catálogo 2026-06-18: página ordenada server-side para sorts best-seller-* (turnover/promo) sobre TODOS os ativos. Retorna linhas de v_products_public. Tie-break name,id espelha byNameThenId() do front. Consumida por fetchCatalogPage com fallback gracioso.';

GRANT EXECUTE ON FUNCTION public.get_catalog_bestseller_page(text,int,int) TO anon, authenticated;
;
