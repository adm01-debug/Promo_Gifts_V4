CREATE OR REPLACE FUNCTION public.fn_supplier_risk_breakdown(p_preferred_only boolean DEFAULT true)
 RETURNS TABLE(supplier_id uuid, supplier_name text, total bigint, ruptura bigint, critico bigint, alerta bigint, atencao bigint, sem_sinal bigint, ok bigint, pct_risco numeric, score_medio numeric, gap_total_un bigint, spikes bigint, valor_risco_reais numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT
    m.supplier_id,
    m.supplier_name,
    count(*)::bigint AS total,
    count(*) FILTER (WHERE m.nivel_alerta = 'RUPTURA')::bigint AS ruptura,
    count(*) FILTER (WHERE m.nivel_alerta = 'CRÍTICO')::bigint AS critico,
    count(*) FILTER (WHERE m.nivel_alerta = 'ALERTA')::bigint  AS alerta,
    count(*) FILTER (WHERE m.nivel_alerta = 'ATENÇÃO')::bigint AS atencao,
    -- 'OK' so no papel: ha estoque, mas a demanda esta no piso da EMA (sem sinal de consumo).
    count(*) FILTER (
      WHERE m.nivel_alerta = 'OK'
        AND COALESCE(m.stock_total, 0) > 0
        AND COALESCE(m.ema_diaria, 0) <= 0.01
    )::bigint AS sem_sinal,
    count(*) FILTER (
      WHERE m.nivel_alerta = 'OK'
        AND NOT (COALESCE(m.stock_total, 0) > 0 AND COALESCE(m.ema_diaria, 0) <= 0.01)
    )::bigint AS ok,
    COALESCE(
      round(
        100.0 * count(*) FILTER (WHERE m.nivel_alerta <> 'OK')::numeric
             / NULLIF(count(*), 0)::numeric,
        1
      ),
      0
    ) AS pct_risco,
    COALESCE(round(avg(COALESCE(m.score_composto, 0))::numeric, 2), 0) AS score_medio,
    COALESCE(sum(COALESCE(m.gap_unidades, 0)), 0)::bigint AS gap_total_un,
    count(*) FILTER (WHERE COALESCE(m.anomalia_spike, false))::bigint AS spikes,
    -- Capital parado em itens sob risco que AINDA tem estoque: ruptura exige stock_live = 0 na MV,
    -- entao contribui 0,00 aqui por construcao. Nao e perda potencial — ver cabecalho e COMMENT.
    COALESCE(
      round(
        sum(COALESCE(m.valor_estoque_reais, 0)) FILTER (WHERE m.nivel_alerta <> 'OK')::numeric,
        2
      ),
      0
    ) AS valor_risco_reais
  FROM public.mv_stock_rupture_alert m
  WHERE public.is_supervisor_or_above((SELECT auth.uid()))
    AND (NOT p_preferred_only OR m.is_preferred = true)
  GROUP BY m.supplier_id, m.supplier_name
  ORDER BY pct_risco DESC, total DESC
$function$
