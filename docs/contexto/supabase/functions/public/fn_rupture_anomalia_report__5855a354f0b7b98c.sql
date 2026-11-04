CREATE OR REPLACE FUNCTION public.fn_rupture_anomalia_report(p_threshold numeric DEFAULT 1.5)
 RETURNS TABLE(vss_id uuid, supplier_name text, supplier_sku text, nivel_alerta text, velocity_trend numeric, ema_diaria numeric, stock_total integer, cobertura_dias numeric, gap_unidades integer, score_composto numeric, descricao_anomalia text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT m.vss_id,m.supplier_name::text,m.supplier_sku::text,m.nivel_alerta::text,
    v.velocity_trend,m.ema_diaria,m.stock_total,m.cobertura_dias,m.gap_unidades,m.score_composto,
    CASE WHEN v.velocity_trend>3.0 THEN 'SPIKE EXTREMO: demanda '||ROUND(v.velocity_trend,1)||'x acima da média'
         WHEN v.velocity_trend>2.0 THEN 'SPIKE ALTO: demanda '||ROUND(v.velocity_trend,1)||'x acima da média'
         ELSE 'SPIKE MODERADO: demanda '||ROUND(v.velocity_trend,1)||'x acima da média'
    END AS descricao_anomalia
  FROM public.mv_stock_rupture_alert m
  JOIN analytics.mv_stock_velocity v ON v.variant_supplier_source_id=m.vss_id
  WHERE m.is_preferred=true AND v.velocity_trend>p_threshold AND m.nivel_alerta!='OK'
  ORDER BY v.velocity_trend DESC,m.score_composto DESC LIMIT 200;
$function$
