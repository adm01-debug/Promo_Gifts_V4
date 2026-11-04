CREATE OR REPLACE FUNCTION public.fn_rupture_by_level(p_nivel text DEFAULT NULL::text, p_limit integer DEFAULT 500, p_offset integer DEFAULT 0, p_preferred boolean DEFAULT true)
 RETURNS TABLE(vss_id uuid, variant_id uuid, supplier_id uuid, supplier_name text, supplier_sku text, nivel_alerta text, prioridade integer, score_composto numeric, cobertura_dias numeric, lead_time_efetivo integer, ema_diaria numeric, stock_total integer, gap_unidades integer, valor_estoque_reais numeric, confidence_level text, anomalia_spike boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    m.vss_id, m.variant_id, m.supplier_id,
    m.supplier_name::text, m.supplier_sku::text,
    m.nivel_alerta::text, m.prioridade::integer,
    m.score_composto, m.cobertura_dias,
    m.lead_time_efetivo, m.ema_diaria, m.stock_total, m.gap_unidades,
    m.valor_estoque_reais, m.confidence_level::text, m.anomalia_spike
  FROM public.mv_stock_rupture_alert m
  WHERE (NOT p_preferred OR m.is_preferred = true)
    AND (
      p_nivel IS NULL AND m.nivel_alerta <> 'OK'
      OR p_nivel IS NOT NULL AND m.nivel_alerta = p_nivel
    )
  -- vss_id como tiebreaker: garante ordenação determinística para LIMIT/OFFSET
  ORDER BY m.prioridade ASC, m.score_composto DESC, m.vss_id ASC
  LIMIT  LEAST(p_limit, 1000)
  OFFSET p_offset;
$function$
