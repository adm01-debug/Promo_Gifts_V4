
CREATE OR REPLACE FUNCTION public.get_promo_sales_ranking()
RETURNS TABLE(product_id uuid, total_qty bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    qi.product_id,
    COALESCE(SUM(qi.quantity), 0)::bigint AS total_qty
  FROM quote_items qi
  JOIN quotes q ON q.id = qi.quote_id
  WHERE qi.product_id IS NOT NULL
    AND q.status IN ('approved', 'pending', 'sent', 'viewed', 'accepted')
  GROUP BY qi.product_id
  ORDER BY total_qty DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_promo_sales_ranking()
  TO authenticated, service_role;

COMMENT ON FUNCTION public.get_promo_sales_ranking IS
  'Ranking de produtos por volume em orçamentos não-rascunho. Audit-10-10 2026-06-18.';
;
