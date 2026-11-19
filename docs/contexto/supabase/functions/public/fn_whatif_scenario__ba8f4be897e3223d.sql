CREATE OR REPLACE FUNCTION public.fn_whatif_scenario(p_delta_units_per_sku numeric DEFAULT 100, p_nivel_filter text DEFAULT 'RUPTURA'::text, p_supplier_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(nivel_atual text, nivel_simulado text, variantes bigint, descricao text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'pg_temp'
AS $function$
  WITH sim AS (
    SELECT a.variant_id,
           a.nivel_alerta,
           CASE
               WHEN (a.stock_total + p_delta_units_per_sku) <= 0 THEN 'RUPTURA'
               WHEN (((a.stock_total + p_delta_units_per_sku)::numeric / NULLIF(a.ema_diaria, 0)))
                    < a.lead_time_efetivo THEN 'CRÍTICO'
               WHEN (((a.stock_total + p_delta_units_per_sku)::numeric / NULLIF(a.ema_diaria, 0)))
                    < (a.lead_time_efetivo * 1.5) THEN 'ALERTA'
               WHEN (((a.stock_total + p_delta_units_per_sku)::numeric / NULLIF(a.ema_diaria, 0)))
                    < (a.lead_time_efetivo * 2.0) THEN 'ATENÇÃO'
               ELSE 'OK'
           END AS nivel_simulado,
           CASE
               WHEN (a.stock_total + p_delta_units_per_sku) <= 0 THEN 1
               WHEN (((a.stock_total + p_delta_units_per_sku)::numeric / NULLIF(a.ema_diaria, 0)))
                    < a.lead_time_efetivo THEN 2
               WHEN (((a.stock_total + p_delta_units_per_sku)::numeric / NULLIF(a.ema_diaria, 0)))
                    < (a.lead_time_efetivo * 1.5) THEN 3
               WHEN (((a.stock_total + p_delta_units_per_sku)::numeric / NULLIF(a.ema_diaria, 0)))
                    < (a.lead_time_efetivo * 2.0) THEN 4
               ELSE 5
           END AS prioridade_sim
    FROM public.mv_stock_rupture_alert a
    WHERE (p_nivel_filter IS NULL OR p_nivel_filter = '' OR a.nivel_alerta = p_nivel_filter)
      AND (p_supplier_id IS NULL OR a.supplier_id = p_supplier_id)
  ),
  pior AS (
    SELECT sim.variant_id, MIN(sim.prioridade_sim) AS pmin
    FROM sim
    GROUP BY sim.variant_id
  )
  SELECT s.nivel_alerta AS nivel_atual,
         s.nivel_simulado,
         COUNT(DISTINCT s.variant_id)::bigint AS variantes,
         CASE s.nivel_simulado
             WHEN 'RUPTURA' THEN 'Sem estoque mesmo após a reposição simulada'
             WHEN 'CRÍTICO' THEN 'Cobertura simulada ainda abaixo do lead time'
             WHEN 'ALERTA'  THEN 'Cobertura simulada entre 1x e 1,5x do lead time'
             WHEN 'ATENÇÃO' THEN 'Cobertura simulada entre 1,5x e 2x do lead time'
             ELSE 'Cobertura simulada acima de 2x do lead time'
         END AS descricao
  FROM sim s
  JOIN pior p ON p.variant_id = s.variant_id AND p.pmin = s.prioridade_sim
  GROUP BY s.nivel_alerta, s.nivel_simulado
  ORDER BY MIN(s.prioridade_sim);
$function$
