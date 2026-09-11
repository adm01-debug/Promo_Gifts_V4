
-- ============================================================
-- RPC: get_catalog_bestseller_page v2 (plpgsql, branch por sort)
-- 2026-06-18 (audit-10-10) — corrige fallback client-side incompleto.
-- ============================================================
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
BEGIN
  IF p_sort = 'best-seller-supplier' THEN
    RETURN QUERY
      SELECT vp.*
      FROM v_products_public vp
      LEFT JOIN mv_product_intelligence mi ON mi.product_id = vp.id
      WHERE (vp.active = true OR vp.is_active = true)
      ORDER BY COALESCE(mi.turnover_score, 0) DESC NULLS LAST, vp.name ASC
      LIMIT v_limit
      OFFSET v_offset;

  ELSIF p_sort = 'best-seller-promo' THEN
    RETURN QUERY
      SELECT vp.*
      FROM v_products_public vp
      WHERE (vp.active = true OR vp.is_active = true)
      ORDER BY
        COALESCE(vp.is_bestseller, false) DESC,
        COALESCE(vp.order_count, 0) DESC NULLS LAST,
        vp.name ASC
      LIMIT v_limit
      OFFSET v_offset;

  ELSE
    -- Fallback seguro para qualquer sort não mapeado
    RETURN QUERY
      SELECT vp.*
      FROM v_products_public vp
      WHERE (vp.active = true OR vp.is_active = true)
      ORDER BY vp.name ASC
      LIMIT v_limit
      OFFSET v_offset;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_catalog_bestseller_page(text, integer, integer)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.get_catalog_bestseller_page IS
  'Paginação server-side para sort best-seller-supplier / best-seller-promo. '
  'Criada em 2026-06-18 audit-10-10. Elimina fallback client-side parcial.';
;
