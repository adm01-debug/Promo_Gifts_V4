CREATE OR REPLACE FUNCTION public.fn_get_reposicao_variants_summary(p_product_ids uuid[])
 RETURNS TABLE(product_id uuid, variants_summary jsonb, total_variants integer, variants_in_stock integer, variants_zeroed integer, variants_with_upcoming integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH v_today AS (
    SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date AS d
  ),
  future_dates AS (
    SELECT pv.id AS variant_id, x.d::date AS dt
    FROM public.product_variants pv
    CROSS JOIN LATERAL (VALUES
      (pv.next_date_1),(pv.next_date_2),(pv.next_date_3),
      (pv.next_date_4),(pv.next_date_5),(pv.next_date_6)
    ) AS x(d)
    WHERE pv.product_id = ANY(p_product_ids)
      AND x.d IS NOT NULL
      AND x.d::date > (SELECT v_today.d FROM v_today)
    UNION ALL
    SELECT vss.variant_id, x.d::date
    FROM public.variant_supplier_sources vss
    JOIN public.product_variants pv2 ON pv2.id = vss.variant_id
    CROSS JOIN LATERAL (VALUES
      (vss.next_date_1),(vss.next_date_2),(vss.next_date_3),
      (vss.next_date_4),(vss.next_date_5),(vss.next_date_6)
    ) AS x(d)
    WHERE pv2.product_id = ANY(p_product_ids)
      AND COALESCE(vss.is_active, true) = true
      AND x.d IS NOT NULL
      AND x.d::date > (SELECT v_today.d FROM v_today)
  ),
  next_per_variant AS (
    SELECT variant_id, MIN(dt) AS next_restock_date
    FROM future_dates
    GROUP BY variant_id
  ),
  vs AS (
    SELECT
      pv.product_id,
      pv.id                                   AS variant_id,
      pv.color_name                           AS nome,
      pv.color_hex                            AS hex,
      COALESCE(pv.stock_quantity, 0)::int     AS stock_qty,
      npv.next_restock_date
    FROM public.product_variants pv
    LEFT JOIN next_per_variant npv ON npv.variant_id = pv.id
    WHERE pv.product_id = ANY(p_product_ids)
      AND COALESCE(pv.is_active, true) = true
  )
  SELECT
    vs.product_id,
    jsonb_agg(
      jsonb_build_object(
        'variant_id',           vs.variant_id,
        'nome',                 vs.nome,
        'hex',                  vs.hex,
        'stock_qty',            vs.stock_qty,
        'has_upcoming_restock', (vs.next_restock_date IS NOT NULL),
        'next_restock_date',    vs.next_restock_date
      )
      ORDER BY vs.nome NULLS LAST
    )                                                              AS variants_summary,
    COUNT(*)::int                                                  AS total_variants,
    COUNT(*) FILTER (WHERE vs.stock_qty > 0)::int                  AS variants_in_stock,
    COUNT(*) FILTER (WHERE vs.stock_qty = 0
                     AND vs.next_restock_date IS NULL)::int        AS variants_zeroed,
    COUNT(*) FILTER (WHERE vs.next_restock_date IS NOT NULL)::int  AS variants_with_upcoming
  FROM vs
  GROUP BY vs.product_id;
$function$
