CREATE OR REPLACE FUNCTION public.fn_market_intelligence_macro(p_days integer DEFAULT 30, p_supplier_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'summary_date', a.summary_date,
        'supplier_id', a.supplier_id,
        'stock_close', a.stock_close,
        'units_depleted', a.units_depleted,
        'units_restocked', a.units_restocked
      )
      ORDER BY a.summary_date, a.supplier_id
    ),
    '[]'::jsonb
  )
  FROM (
    SELECT
      s.summary_date,
      s.supplier_id,
      SUM(COALESCE(s.stock_close, 0))::bigint     AS stock_close,
      SUM(COALESCE(s.units_depleted, 0))::bigint  AS units_depleted,
      SUM(COALESCE(s.units_restocked, 0))::bigint AS units_restocked
    FROM public.stock_daily_summary s
    WHERE s.summary_date >= CURRENT_DATE - LEAST(GREATEST(COALESCE(p_days, 30), 1), 366)
      AND (p_supplier_id IS NULL OR s.supplier_id = p_supplier_id)
    GROUP BY s.summary_date, s.supplier_id
  ) a
$function$
