CREATE OR REPLACE FUNCTION public.fn_rupture_health_check()
 RETURNS TABLE(check_name text, status text, value_atual text, threshold text, severidade text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT t.cn,t.st,t.va,t.th,t.sv FROM (
    SELECT 'C01_VIEW_EXISTE'::text,CASE WHEN COUNT(*)>0 THEN 'OK' ELSE 'CRÍTICO' END,COUNT(*)::text,'>0'::text,'1_CRITICO'::text FROM mv_stock_rupture_alert
    UNION ALL SELECT 'C02_RUPTURA_100_UNICO',CASE WHEN MAX(score_composto)FILTER(WHERE nivel_alerta!='RUPTURA')<100.00 THEN 'OK' ELSE 'ERRO' END,MAX(score_composto)FILTER(WHERE nivel_alerta!='RUPTURA')::text,'<100','1_CRITICO' FROM mv_stock_rupture_alert
    UNION ALL SELECT 'C03_NIVEL_VALIDO',CASE WHEN COUNT(*)FILTER(WHERE nivel_alerta NOT IN('RUPTURA','CRÍTICO','ALERTA','ATENÇÃO','OK'))=0 THEN 'OK' ELSE 'ERRO' END,COUNT(*)FILTER(WHERE nivel_alerta NOT IN('RUPTURA','CRÍTICO','ALERTA','ATENÇÃO','OK'))::text,'=0','1_CRITICO' FROM mv_stock_rupture_alert
    UNION ALL SELECT 'C04_EMA_FLOOR',CASE WHEN COUNT(*)FILTER(WHERE ema_diaria<0.01)=0 THEN 'OK' ELSE 'ERRO' END,COUNT(*)FILTER(WHERE ema_diaria<0.01)::text,'=0','2_ALTO' FROM mv_stock_rupture_alert
    UNION ALL SELECT 'C05_BIJECTION_RUPTURA',CASE WHEN COUNT(*)FILTER(WHERE nivel_alerta='RUPTURA' AND stock_total!=0)=0 AND COUNT(*)FILTER(WHERE nivel_alerta!='RUPTURA' AND stock_total=0)=0 THEN 'OK' ELSE 'ERRO' END,(COUNT(*)FILTER(WHERE nivel_alerta='RUPTURA' AND stock_total!=0)+COUNT(*)FILTER(WHERE nivel_alerta!='RUPTURA' AND stock_total=0))::text,'=0','1_CRITICO' FROM mv_stock_rupture_alert
    UNION ALL SELECT 'C06_VELOCITY_FRESCA',CASE WHEN MAX(last_update_date)>=CURRENT_DATE-1 THEN 'OK' ELSE 'WARN' END,MAX(last_update_date)::text,'>=hoje-1d','3_MEDIO' FROM analytics.mv_stock_velocity
    UNION ALL SELECT 'C07_KPI_5_NIVEIS',CASE WHEN COUNT(*)=5 THEN 'OK' ELSE 'WARN' END,COUNT(*)::text,'=5','4_BAIXO' FROM mv_ema_kpi_by_level
    UNION ALL SELECT 'C08_CRONS_3_ATIVOS',CASE WHEN COUNT(*)=3 THEN 'OK' ELSE 'WARN' END,COUNT(*)::text,'=3','3_MEDIO' FROM cron.job WHERE jobname IN('refresh-analytics-mv-stock-velocity','refresh-mv-stock-rupture-alert','refresh-mv-ema-kpi-by-level') AND active=true
    UNION ALL SELECT 'C09_ZERO_GHOSTS',CASE WHEN COUNT(*)FILTER(WHERE nivel_alerta='CRÍTICO' AND score_composto=100.00)=0 THEN 'OK' ELSE 'WARN' END,COUNT(*)FILTER(WHERE nivel_alerta='CRÍTICO' AND score_composto=100.00)::text,'=0','4_BAIXO' FROM mv_stock_rupture_alert
    UNION ALL SELECT 'C10_LEADS_CONFIGURADOS',CASE WHEN COUNT(*)FILTER(WHERE delivery_time_days IS NULL AND active=true)=0 THEN 'OK' ELSE 'WARN' END,COUNT(*)FILTER(WHERE delivery_time_days IS NULL AND active=true)::text,'=0 ativos','3_MEDIO' FROM suppliers
    UNION ALL SELECT 'C11_SCORE_0_100',CASE WHEN MIN(score_composto)>=0 AND MAX(score_composto)<=100 THEN 'OK' ELSE 'ERRO' END,MIN(score_composto)||'..'||MAX(score_composto),'[0,100]','1_CRITICO' FROM mv_stock_rupture_alert
  ) t(cn,st,va,th,sv) ORDER BY t.sv,t.cn;
END;
$function$
