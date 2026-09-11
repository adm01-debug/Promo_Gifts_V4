-- DROP antes de recriar (nova coluna no RETURNS TABLE exige DROP)
DROP FUNCTION IF EXISTS public.fn_get_reposicao_listing(uuid,uuid,text,integer,integer,integer);

CREATE OR REPLACE FUNCTION public.fn_get_reposicao_listing(
  p_supplier_id uuid DEFAULT NULL::uuid,
  p_category_id uuid DEFAULT NULL::uuid,
  p_sort_by text DEFAULT 'mais_recentes'::text,
  p_limit integer DEFAULT 48,
  p_offset integer DEFAULT 0,
  p_days integer DEFAULT 30
)
RETURNS TABLE(
  product_id uuid, name text, slug text, sku text, sale_price numeric,
  is_stockout boolean, is_new boolean, total_stock bigint,
  primary_image_url text, primary_image_cdn text,
  supplier_id uuid, supplier_name text, supplier_code text,
  ultimo_restock_date date, earliest_restock_date date,
  earliest_restock_qty bigint, has_upcoming_restock boolean,
  category_names text[], primary_category_id uuid, primary_category_name text,
  is_low_stock boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  p_limit := GREATEST(p_limit, 0);
  RETURN QUERY
  WITH
  restock_events AS (
    SELECT DISTINCT ON (g.product_id) g.product_id, g.supplier_id, g.ultimo_restock
    FROM (
      SELECT sd.product_id, sd.supplier_id, MAX(sd.summary_date) AS ultimo_restock
      FROM stock_daily_summary sd
      WHERE sd.restock_zero_to_positive = true
        AND COALESCE(sd.stock_close, 0) > 0
        AND sd.summary_date >= v_today - p_days
      GROUP BY sd.product_id, sd.supplier_id
    ) g
    ORDER BY g.product_id, g.ultimo_restock DESC, g.supplier_id
  ),
  variant_agg AS (
    SELECT pv.product_id,
      SUM(pv.stock_quantity) AS total_stock,
      MIN(pv.next_date_1) FILTER (WHERE pv.next_date_1 > v_today) AS earliest_restock_date,
      SUM(pv.next_quantity_1) FILTER (WHERE pv.next_date_1 > v_today) AS earliest_restock_qty,
      BOOL_OR(pv.next_date_1 IS NOT NULL AND pv.next_date_1 > v_today) AS has_upcoming_restock
    FROM product_variants pv
    WHERE pv.is_active = true
      AND pv.product_id IN (SELECT re2.product_id FROM restock_events re2)
    GROUP BY pv.product_id
  ),
  primary_imgs AS (
    SELECT DISTINCT ON (pi.product_id) pi.product_id, pi.url_cdn
    FROM product_images pi
    WHERE pi.is_primary = true AND pi.is_active = true
      AND pi.product_id IN (SELECT re3.product_id FROM restock_events re3)
    ORDER BY pi.product_id, pi.updated_at DESC NULLS LAST
  ),
  category_agg AS (
    SELECT d.product_id,
      (ARRAY_AGG(d.resolved_name ORDER BY d.resolved_name))[1:3] AS category_names,
      (ARRAY_AGG(d.resolved_id   ORDER BY d.resolved_name))[1]   AS primary_category_id,
      (ARRAY_AGG(d.resolved_name ORDER BY d.resolved_name))[1]   AS primary_category_name
    FROM (
      SELECT DISTINCT pca.product_id,
        COALESCE(
          CASE WHEN c.level IN (1,2) THEN c.id END, CASE WHEN p1.level IN (1,2) THEN p1.id END,
          CASE WHEN p2.level IN (1,2) THEN p2.id END, CASE WHEN p3.level IN (1,2) THEN p3.id END,
          CASE WHEN p4.level IN (1,2) THEN p4.id END
        ) AS resolved_id,
        COALESCE(
          CASE WHEN c.level IN (1,2) THEN c.name END, CASE WHEN p1.level IN (1,2) THEN p1.name END,
          CASE WHEN p2.level IN (1,2) THEN p2.name END, CASE WHEN p3.level IN (1,2) THEN p3.name END,
          CASE WHEN p4.level IN (1,2) THEN p4.name END
        ) AS resolved_name
      FROM product_category_assignments pca
      JOIN categories c ON c.id = pca.category_id
      LEFT JOIN categories p1 ON p1.id = c.parent_id
      LEFT JOIN categories p2 ON p2.id = p1.parent_id
      LEFT JOIN categories p3 ON p3.id = p2.parent_id
      LEFT JOIN categories p4 ON p4.id = p3.parent_id
      WHERE pca.product_id IN (SELECT re4.product_id FROM restock_events re4)
    ) d WHERE d.resolved_id IS NOT NULL
    GROUP BY d.product_id
  ),
  product_base AS (
    SELECT
      p.id, p.name, p.slug, p.sku, p.sale_price, p.is_stockout, p.is_new,
      re.supplier_id, p.primary_image_url, re.ultimo_restock,
      s.name AS supplier_name, s.code AS supplier_code,
      s.low_stock_threshold,
      pi.url_cdn AS primary_image_cdn,
      COALESCE(va.total_stock, 0) AS total_stock,
      va.earliest_restock_date,
      COALESCE(va.earliest_restock_qty, 0) AS earliest_restock_qty,
      COALESCE(va.has_upcoming_restock, false) AS has_upcoming_restock,
      COALESCE(ca.category_names, ARRAY[]::text[]) AS category_names,
      ca.primary_category_id, ca.primary_category_name
    FROM restock_events re
    JOIN products p  ON p.id = re.product_id AND p.is_active = true
    JOIN suppliers s ON s.id = re.supplier_id
    LEFT JOIN primary_imgs pi ON pi.product_id = p.id
    LEFT JOIN variant_agg va  ON va.product_id = p.id
    LEFT JOIN category_agg ca ON ca.product_id = p.id
    WHERE (p_supplier_id IS NULL OR re.supplier_id = p_supplier_id)
      AND (p_category_id IS NULL OR EXISTS (
            SELECT 1 FROM product_category_assignments pca5
            WHERE pca5.product_id = p.id AND pca5.category_id = p_category_id))
  )
  SELECT
    pb.id, pb.name::text, pb.slug::text, pb.sku::text, pb.sale_price,
    pb.is_stockout, pb.is_new, pb.total_stock,
    pb.primary_image_url::text, pb.primary_image_cdn::text,
    pb.supplier_id, pb.supplier_name::text, pb.supplier_code::text,
    pb.ultimo_restock, pb.earliest_restock_date, pb.earliest_restock_qty,
    pb.has_upcoming_restock, pb.category_names,
    pb.primary_category_id, pb.primary_category_name::text,
    (pb.total_stock > 0 AND pb.low_stock_threshold IS NOT NULL
     AND pb.total_stock <= pb.low_stock_threshold) AS is_low_stock
  FROM product_base pb
  ORDER BY
    CASE WHEN p_sort_by='nome_az'       THEN pb.name        END ASC  NULLS LAST,
    CASE WHEN p_sort_by='nome_za'       THEN pb.name        END DESC NULLS LAST,
    CASE WHEN p_sort_by='preco_menor'   THEN pb.sale_price  END ASC  NULLS LAST,
    CASE WHEN p_sort_by='preco_maior'   THEN pb.sale_price  END DESC NULLS LAST,
    CASE WHEN p_sort_by='maior_estoque' THEN pb.total_stock END DESC NULLS LAST,
    CASE WHEN p_sort_by NOT IN ('nome_az','nome_za','preco_menor','preco_maior','maior_estoque')
         THEN pb.ultimo_restock END DESC NULLS LAST,
    pb.id
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- Re-grant (DROP remove grants)
GRANT EXECUTE ON FUNCTION public.fn_get_reposicao_listing(uuid,uuid,text,integer,integer,integer) TO anon, authenticated;

-- PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

SELECT 'fn_get_reposicao_listing com is_low_stock deployado' AS status;
;
