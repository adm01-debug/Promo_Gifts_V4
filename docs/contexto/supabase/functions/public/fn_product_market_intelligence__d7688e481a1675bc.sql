CREATE OR REPLACE FUNCTION public.fn_product_market_intelligence(p_product_id uuid, p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog', 'public', 'analytics'
AS $function$
DECLARE
  v_result jsonb;
  v_kpis jsonb;
  v_chart jsonb;
  v_suppliers jsonb;
  v_price_alerts jsonb;
  v_avg_depletion numeric;
  v_trend numeric;
  v_total_stock bigint;
  v_supplier_count bigint;
  v_demand_label text;
  v_classification text;
  v_turnover_score numeric;
BEGIN

  -- ═══════════════════════════════════
  -- KPIs PRINCIPAIS (período dinâmico)
  -- ═══════════════════════════════════
  WITH period_data AS (
    SELECT
      sd.supplier_id,
      SUM(sd.units_depleted) AS total_depleted,
      COUNT(*) FILTER (WHERE sd.sync_count > 0) AS active_days,
      MIN(sd.stock_close) AS min_stock,
      MAX(sd.stock_close) AS max_stock
    FROM stock_daily_summary sd
    WHERE sd.product_id = p_product_id
      AND sd.summary_date >= CURRENT_DATE - p_days
    GROUP BY sd.supplier_id
  ),
  -- Período recente (últimos 7 dias) pra calcular velocidade atual
  recent_data AS (
    SELECT
      SUM(sd.units_depleted) AS depleted_7d,
      COUNT(*) FILTER (WHERE sd.sync_count > 0) AS active_days_7d
    FROM stock_daily_summary sd
    WHERE sd.product_id = p_product_id
      AND sd.summary_date >= CURRENT_DATE - 7
  ),
  -- Estoque atual de cada fornecedor
  current_stock AS (
    SELECT 
      COUNT(DISTINCT vss.supplier_id) AS supplier_count,
      SUM(vss.stock_main_warehouse + vss.stock_other_warehouses) AS total_stock
    FROM variant_supplier_sources vss
    JOIN product_variants pv ON pv.id = vss.variant_id
    WHERE pv.product_id = p_product_id
      AND (vss.stock_main_warehouse + vss.stock_other_warehouses) > 0
  )
  SELECT INTO v_avg_depletion, v_total_stock, v_supplier_count
    COALESCE(
      (SELECT depleted_7d::numeric / NULLIF(active_days_7d, 0) FROM recent_data),
      COALESCE(SUM(pd.total_depleted)::numeric / NULLIF(SUM(pd.active_days), 0), 0)
    ),
    COALESCE(cs.total_stock, 0),
    COALESCE(cs.supplier_count, 0)
  FROM current_stock cs
  LEFT JOIN period_data pd ON true
  GROUP BY cs.total_stock, cs.supplier_count;

  -- Defaults se não houver dados
  v_avg_depletion := COALESCE(v_avg_depletion, 0);
  v_total_stock := COALESCE(v_total_stock, 0);
  v_supplier_count := COALESCE(v_supplier_count, 0);

  -- Tendência: comparar primeira metade vs segunda metade do período
  SELECT INTO v_trend
    CASE 
      WHEN COALESCE(first_half, 0) > 0 
      THEN ROUND(((second_half::numeric / NULLIF(first_half, 0)) - 1) * 100, 0)
      ELSE 0
    END
  FROM (
    SELECT
      SUM(CASE WHEN sd.summary_date < CURRENT_DATE - (p_days / 2) THEN sd.units_depleted ELSE 0 END) AS first_half,
      SUM(CASE WHEN sd.summary_date >= CURRENT_DATE - (p_days / 2) THEN sd.units_depleted ELSE 0 END) AS second_half
    FROM stock_daily_summary sd
    WHERE sd.product_id = p_product_id
      AND sd.summary_date >= CURRENT_DATE - p_days
  ) halves;

  v_trend := COALESCE(v_trend, 0);

  -- Classificação de demanda
  v_demand_label := CASE
    WHEN v_avg_depletion >= 10 AND v_trend > 10 THEN 'Muito Alta'
    WHEN v_avg_depletion >= 5 OR v_trend > 20 THEN 'Alta'
    WHEN v_avg_depletion >= 1 THEN 'Normal'
    WHEN v_avg_depletion > 0 THEN 'Baixa'
    ELSE 'Sem dados'
  END;

  -- Classificação do produto
  SELECT INTO v_classification, v_turnover_score
    CASE
      WHEN pi.is_hot_product THEN 'Quente'
      WHEN pi.is_stockout_risk THEN 'Risco de Ruptura'
      WHEN pi.is_stagnant THEN 'Estagnado'
      WHEN pi.is_negotiation_opportunity THEN 'Oportunidade'
      ELSE 'Normal'
    END,
    COALESCE(pi.turnover_score, 0)
  FROM mv_product_intelligence pi
  WHERE pi.product_id = p_product_id;

  v_classification := COALESCE(v_classification, 'Sem dados');
  v_turnover_score := COALESCE(v_turnover_score, 0);

  v_kpis := jsonb_build_object(
    'vendas_dia_media', ROUND(v_avg_depletion, 1),
    'demanda', v_demand_label,
    'demanda_crescendo', v_trend > 0,
    'tendencia_pct', v_trend,
    'disponivel_total', v_total_stock,
    'fornecedores_count', v_supplier_count,
    'potencial', v_turnover_score,
    'classificacao', v_classification,
    'dias_ate_ruptura', (
      SELECT ROUND(MIN(sv.days_to_stockout), 0)
      FROM mv_stock_velocity sv 
      WHERE sv.product_id = p_product_id
    )
  );

  -- ═══════════════════════════════════
  -- DADOS DO GRÁFICO (série temporal)
  -- ═══════════════════════════════════
  SELECT INTO v_chart
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'data', dia.summary_date,
        'disponivel', dia.disponivel,
        'compras_mercado', dia.compras,
        'reposicao', dia.reposicao
      ) ORDER BY dia.summary_date
    ), '[]'::jsonb)
  FROM (
    SELECT
      sd.summary_date,
      SUM(sd.stock_close) AS disponivel,
      SUM(sd.units_depleted) AS compras,
      SUM(CASE WHEN sd.restock_detected THEN sd.restock_quantity ELSE 0 END) AS reposicao
    FROM stock_daily_summary sd
    WHERE sd.product_id = p_product_id
      AND sd.summary_date >= CURRENT_DATE - p_days
    GROUP BY sd.summary_date
  ) dia;

  -- ═══════════════════════════════════
  -- COMPARATIVO POR FORNECEDOR
  -- ═══════════════════════════════════
  SELECT INTO v_suppliers
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'fornecedor', sup.name,
        'supplier_id', sup.supplier_id,
        'saida_dia', sup.saida_dia,
        'estoque', sup.estoque,
        'tendencia_pct', sup.tendencia_pct,
        'maior_saida', sup.ranking = 1,
        'preco_atual', sup.preco_atual,
        'dias_ate_ruptura', sup.dias_ruptura
      ) ORDER BY sup.saida_dia DESC NULLS LAST
    ), '[]'::jsonb)
  FROM (
    SELECT 
      s.name,
      sv.supplier_id,
      sv.avg_daily_depletion_7d AS saida_dia,
      sv.current_stock AS estoque,
      ROUND((COALESCE(sv.velocity_trend, 1) - 1) * 100, 0) AS tendencia_pct,
      sv.current_price AS preco_atual,
      ROUND(sv.days_to_stockout, 0) AS dias_ruptura,
      RANK() OVER (ORDER BY sv.avg_daily_depletion_7d DESC NULLS LAST) AS ranking
    FROM mv_stock_velocity sv
    JOIN suppliers s ON s.id = sv.supplier_id
    WHERE sv.product_id = p_product_id
  ) sup;

  -- ═══════════════════════════════════
  -- ALERTAS DE PREÇO
  -- ═══════════════════════════════════
  SELECT INTO v_price_alerts
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'fornecedor', s.name,
        'mudancas_preco_30d', sv.price_changes_30d
      )
    ), '[]'::jsonb)
  FROM mv_stock_velocity sv
  JOIN suppliers s ON s.id = sv.supplier_id
  WHERE sv.product_id = p_product_id
    AND sv.price_changes_30d > 0;

  -- ═══════════════════════════════════
  -- RESULTADO FINAL
  -- ═══════════════════════════════════
  v_result := jsonb_build_object(
    'product_id', p_product_id,
    'periodo_dias', p_days,
    'kpis', v_kpis,
    'grafico', v_chart,
    'fornecedores', v_suppliers,
    'alertas_preco', v_price_alerts,
    'gerado_em', now()
  );

  RETURN v_result;
END;
$function$
