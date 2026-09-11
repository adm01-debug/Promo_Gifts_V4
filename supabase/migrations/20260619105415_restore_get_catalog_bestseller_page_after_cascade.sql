
-- RESTAURAÇÃO: get_catalog_bestseller_page dropada por CASCADE do DROP VIEW
-- Definição recuperada de supabase/migrations/20260618204424_get_catalog_bestseller_page_v2.sql

CREATE OR REPLACE FUNCTION public.get_catalog_bestseller_page(
  p_sort   text    DEFAULT 'best-seller-supplier',
  p_limit  integer DEFAULT 500,
  p_offset integer DEFAULT 0
)
RETURNS SETOF public.v_products_public
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
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
    v_sql := '
      SELECT vp.*
      FROM public.v_products_public vp
      WHERE vp.active = true
      ORDER BY vp.name ASC, vp.id ASC
      LIMIT ' || v_limit || ' OFFSET ' || v_offset;
  END IF;

  RETURN QUERY EXECUTE v_sql;
END;
$function$;

COMMENT ON FUNCTION public.get_catalog_bestseller_page(text,integer,integer) IS
  'Sort server-side de v_products_public. Restaurada após DROP CASCADE (2026-06-18 audit).
   v2 2026-06-18: sem hard cap de 2000. STABLE, SECURITY DEFINER, search_path=public.';

GRANT EXECUTE ON FUNCTION public.get_catalog_bestseller_page(text,integer,integer)
  TO anon, authenticated;
;
