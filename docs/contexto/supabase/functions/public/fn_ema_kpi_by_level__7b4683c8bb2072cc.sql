CREATE OR REPLACE FUNCTION public.fn_ema_kpi_by_level(p_preferred_only boolean DEFAULT true)
 RETURNS TABLE(nivel_alerta text, prioridade integer, total_variantes bigint, avg_cobertura numeric, min_cobertura numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT k.nivel_alerta::text,k.prioridade::integer,k.total_variantes,k.avg_cobertura,k.min_cobertura
  FROM public.mv_ema_kpi_by_level k ORDER BY k.prioridade;
$function$
