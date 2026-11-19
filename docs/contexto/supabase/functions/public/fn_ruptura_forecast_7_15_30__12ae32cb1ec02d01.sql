CREATE OR REPLACE FUNCTION public.fn_ruptura_forecast_7_15_30()
 RETURNS TABLE(horizonte_dias integer, novos_ruptura bigint, com_restock bigint, net_ruptura bigint, score_medio numeric, gap_total_un bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'pg_temp'
AS $function$
  WITH alert AS (
    SELECT a.vss_id, a.cobertura_dias, a.score_composto, a.gap_unidades
    FROM public.mv_stock_rupture_alert a
  ),
  restock AS (
    SELECT vss.id AS vss_id,
           ARRAY[vss.next_quantity_1, vss.next_quantity_2, vss.next_quantity_3,
                 vss.next_quantity_4, vss.next_quantity_5, vss.next_quantity_6] AS qtys,
           ARRAY[vss.next_date_1, vss.next_date_2, vss.next_date_3,
                 vss.next_date_4, vss.next_date_5, vss.next_date_6] AS dates
    FROM public.variant_supplier_sources vss
  )
  SELECT h.horizonte_dias,
         c.novos_ruptura,
         c.com_restock,
         GREATEST(c.novos_ruptura - c.com_restock, 0) AS net_ruptura,
         c.score_medio,
         c.gap_total_un
  FROM (VALUES (7), (15), (30)) AS h(horizonte_dias)
  CROSS JOIN LATERAL (
    SELECT COUNT(*)::bigint AS novos_ruptura,
           COUNT(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM restock r, generate_subscripts(r.qtys, 1) AS s(i)
             WHERE r.vss_id = alert.vss_id
               AND r.qtys[s.i] > 0
               AND r.dates[s.i] BETWEEN CURRENT_DATE AND CURRENT_DATE + h.horizonte_dias
           ))::bigint AS com_restock,
           ROUND(AVG(alert.score_composto), 1) AS score_medio,
           COALESCE(SUM(alert.gap_unidades), 0)::bigint AS gap_total_un
    FROM alert
    WHERE alert.cobertura_dias <= h.horizonte_dias
  ) c
  ORDER BY h.horizonte_dias;
$function$
