CREATE OR REPLACE FUNCTION public.fn_variant_sparkline(p_variant_id uuid, p_days integer DEFAULT 7)
 RETURNS TABLE(day date, units_depleted integer, stock_close integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'pg_temp'
AS $function$
  SELECT s.summary_date::date AS day,
         s.units_depleted,
         s.stock_close
  FROM public.stock_daily_summary s
  WHERE s.variant_id = p_variant_id
    AND s.summary_date >= (CURRENT_DATE - (p_days - 1))
  ORDER BY s.summary_date ASC
  LIMIT GREATEST(p_days, 1);
$function$
