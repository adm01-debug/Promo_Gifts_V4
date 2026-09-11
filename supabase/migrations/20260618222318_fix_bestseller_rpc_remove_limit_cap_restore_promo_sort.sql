
-- FIX CRÍTICO (2026-06-18, audit round 3):
-- Migrações _rpc_v2 e _dynamic_sql substituíram a função com 2 regressões:
--   1. LEAST(..., 2000): limite hardcoded → impossível paginar além de 2000 linhas
--   2. best-seller-promo usava order_count (=0 em todos os produtos) → sort inútil
--
-- Esta migration corrige ambas as regressões, mantendo a estrutura plpgsql
-- e adicionando is_bestseller como sinal secundário no sort de promo.

CREATE OR REPLACE FUNCTION public.get_catalog_bestseller_page(
  p_sort   text    DEFAULT 'best-seller-supplier',
  p_limit  integer DEFAULT 500,
  p_offset integer DEFAULT 0
)
RETURNS SETOF public.v_products_public
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  -- FIX: remove o hard cap de 2000. Aceita qualquer limit >= 0; default 500.
  v_limit  integer := GREATEST(COALESCE(p_limit, 500), 0);
  v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
  v_sql    text;
BEGIN
  IF p_sort = 'best-seller-supplier' THEN
    v_sql := '
      SELECT vp.*
      FROM public.v_products_public vp
      LEFT JOIN public.mv_product_intelligence mi ON mi.product_id = vp.id
      WHERE vp.active = true
      ORDER BY COALESCE(mi.turnover_score, 0) DESC NULLS LAST, vp.name ASC, vp.id ASC
      LIMIT ' || v_limit || ' OFFSET ' || v_offset;

  ELSIF p_sort = 'best-seller-promo' THEN
    -- FIX: restaura sort por quote_items (vendas reais).
    -- is_bestseller como sinal secundário quando qty empata.
    v_sql := '
      SELECT vp.*
      FROM public.v_products_public vp
      LEFT JOIN (
        SELECT product_id AS pid, sum(COALESCE(quantity, 1)) AS promo_qty
        FROM public.quote_items
        WHERE product_id IS NOT NULL
        GROUP BY product_id
      ) qs ON qs.pid = vp.id
      WHERE vp.active = true
      ORDER BY
        COALESCE(qs.promo_qty, 0) DESC NULLS LAST,
        COALESCE(vp.is_bestseller, false) DESC,
        vp.name ASC, vp.id ASC
      LIMIT ' || v_limit || ' OFFSET ' || v_offset;

  ELSE
    -- Fallback: name ASC (graceful para p_sort inválido ou NULL)
    v_sql := '
      SELECT vp.*
      FROM public.v_products_public vp
      WHERE vp.active = true
      ORDER BY vp.name ASC, vp.id ASC
      LIMIT ' || v_limit || ' OFFSET ' || v_offset;
  END IF;

  RETURN QUERY EXECUTE v_sql;
END;
$fn$;

COMMENT ON FUNCTION public.get_catalog_bestseller_page(text,int,int) IS
  'FIX 2026-06-18: remove hard cap de 2000, restaura sort promo via quote_items.
   best-seller-supplier: turnover_score (mv_product_intelligence).
   best-seller-promo: soma de quote_items.quantity (vendas reais).
   Tie-break: name ASC, id ASC. STABLE, SECURITY DEFINER, search_path=public.';

GRANT EXECUTE ON FUNCTION public.get_catalog_bestseller_page(text,int,int) TO anon, authenticated;
;
