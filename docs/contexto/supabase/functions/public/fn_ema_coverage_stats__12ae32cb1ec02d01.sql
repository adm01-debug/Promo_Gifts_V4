CREATE OR REPLACE FUNCTION public.fn_ema_coverage_stats()
 RETURNS TABLE(metric text, valor numeric, unidade text, status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'pg_temp'
AS $function$
  WITH base AS (
    SELECT a.ema_diaria, a.confidence_level, a.anomalia_spike
    FROM public.mv_stock_rupture_alert a
  )
  SELECT 'pct_cobertura_ema'::text AS metric,
         ROUND(100.0 * COUNT(*) FILTER (WHERE base.ema_diaria > 0.01) / NULLIF(COUNT(*), 0), 1),
         'pct'::text,
         CASE WHEN COUNT(*) FILTER (WHERE base.ema_diaria > 0.01) = 0
              THEN 'WARN'::text ELSE 'OK'::text END
  FROM base
  UNION ALL
  SELECT 'pct_alta_confianca'::text,
         ROUND(100.0 * COUNT(*) FILTER (WHERE base.confidence_level = 'ALTA') / NULLIF(COUNT(*), 0), 1),
         'pct'::text,
         CASE WHEN COUNT(*) FILTER (WHERE base.confidence_level = 'ALTA') = 0
              THEN 'WARN'::text ELSE 'OK'::text END
  FROM base
  UNION ALL
  SELECT 'spikes_ativos'::text,
         COUNT(*) FILTER (WHERE base.anomalia_spike)::numeric,
         'un'::text,
         CASE WHEN COUNT(*) FILTER (WHERE base.anomalia_spike) > 0
              THEN 'WARN'::text ELSE 'OK'::text END
  FROM base;
$function$
