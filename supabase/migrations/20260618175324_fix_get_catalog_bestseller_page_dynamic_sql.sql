
-- FIX: reescrever com EXECUTE para garantir plano correto em SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_catalog_bestseller_page(
  p_sort   text    DEFAULT 'best-seller-supplier',
  p_limit  integer DEFAULT 500,
  p_offset integer DEFAULT 0
)
RETURNS SETOF public.v_products_public
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit  integer := LEAST(GREATEST(COALESCE(p_limit, 500), 1), 2000);
  v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
  v_sql    text;
BEGIN
  IF p_sort = 'best-seller-supplier' THEN
    v_sql := '
      SELECT vp.*
      FROM public.v_products_public vp
      LEFT JOIN public.mv_product_intelligence mi ON mi.product_id = vp.id
      ORDER BY COALESCE(mi.turnover_score, 0) DESC NULLS LAST, vp.name ASC
      LIMIT ' || v_limit || ' OFFSET ' || v_offset;

  ELSIF p_sort = 'best-seller-promo' THEN
    v_sql := '
      SELECT vp.*
      FROM public.v_products_public vp
      ORDER BY
        COALESCE(vp.is_bestseller, false) DESC,
        COALESCE(vp.order_count, 0) DESC NULLS LAST,
        vp.name ASC
      LIMIT ' || v_limit || ' OFFSET ' || v_offset;

  ELSE
    v_sql := '
      SELECT vp.*
      FROM public.v_products_public vp
      ORDER BY vp.name ASC
      LIMIT ' || v_limit || ' OFFSET ' || v_offset;
  END IF;

  RETURN QUERY EXECUTE v_sql;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_catalog_bestseller_page(text, integer, integer)
  TO authenticated, service_role;
;
