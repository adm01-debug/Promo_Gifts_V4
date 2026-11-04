CREATE OR REPLACE FUNCTION public.fn_rupture_quick_stats()
 RETURNS TABLE(nivel_alerta text, prioridade integer, total_variantes bigint, total_gap_unidades bigint, total_valor_estoque numeric, com_anomalia_spike bigint, avg_cobertura numeric, refreshed_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT nivel_alerta,prioridade,total_variantes,total_gap_unidades,total_valor_estoque,com_anomalia_spike,avg_cobertura,refreshed_at
  FROM public.mv_ema_kpi_by_level ORDER BY prioridade;
$function$
