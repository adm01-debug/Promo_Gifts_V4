
-- Ranking server-side de "+ Vendidos" sobre TODOS os ativos (corrige janela parcial client-side).
-- best-seller-supplier: turnover_score (mv_product_intelligence)
-- best-seller-promo:    soma de quantity em quote_items
-- Tie-break name ASC, id ASC ESPELHA byNameThenId() do front (consistência cliente/servidor).
CREATE OR REPLACE FUNCTION public.get_catalog_bestseller_ids(
  p_sort text DEFAULT 'best-seller-supplier',
  p_limit int DEFAULT 500,
  p_offset int DEFAULT 0
)
RETURNS TABLE(product_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $fn$
  SELECT p.id
  FROM products p
  LEFT JOIN mv_product_intelligence mi ON mi.product_id = p.id
  LEFT JOIN (
    SELECT qi.product_id AS pid, sum(COALESCE(qi.quantity,1)) AS promo_qty
    FROM quote_items qi WHERE qi.product_id IS NOT NULL GROUP BY qi.product_id
  ) qs ON qs.pid = p.id
  WHERE p.active = true
  ORDER BY
    CASE WHEN p_sort = 'best-seller-promo'    THEN COALESCE(qs.promo_qty, 0) END DESC NULLS LAST,
    CASE WHEN p_sort = 'best-seller-supplier' THEN COALESCE(mi.turnover_score, 0) END DESC NULLS LAST,
    p.name ASC, p.id ASC
  LIMIT GREATEST(p_limit, 0) OFFSET GREATEST(p_offset, 0);
$fn$;

COMMENT ON FUNCTION public.get_catalog_bestseller_ids(text,int,int) IS
  'Auditoria catálogo 2026-06-18: ordem server-side para sorts best-seller-* (turnover/promo) sobre todos os ativos, com paginação. Consumida por fetchCatalogPage com fallback gracioso.';

GRANT EXECUTE ON FUNCTION public.get_catalog_bestseller_ids(text,int,int) TO anon, authenticated;
;
