
-- FIX BUG-A (2026-06-18): mv_product_intelligence truncada em 1 000/7 243 linhas
-- PostgREST max_rows=1000 ignora o Range header quando dbInvoke usa .range(0, 19999).
-- RPC bypassa max_rows → retorna TODAS as linhas sem paginação.
CREATE OR REPLACE FUNCTION public.fn_get_product_intelligence_all()
RETURNS TABLE (
  product_id            UUID,
  turnover_score        NUMERIC,
  avg_depletion_7d      NUMERIC,
  avg_depletion_30d     NUMERIC,
  abc_classification    TEXT,
  total_depleted_30d    NUMERIC,
  total_depleted_90d    NUMERIC
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    product_id,
    turnover_score,
    avg_depletion_7d,
    avg_depletion_30d,
    abc_classification::TEXT,
    total_depleted_30d,
    total_depleted_90d
  FROM public.mv_product_intelligence
  WHERE product_id IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_product_intelligence_all() TO anon, authenticated;

COMMENT ON FUNCTION public.fn_get_product_intelligence_all() IS
'Retorna TODAS as linhas de mv_product_intelligence (7 243+) sem limitação de max_rows.
 Criada em 2026-06-18 para fix BUG-A: dbInvoke com limit:20000 truncava em 1 000 linhas
 (PostgREST max_rows padrão Supabase), deixando 6 243 produtos com turnover_score=0.';
;
