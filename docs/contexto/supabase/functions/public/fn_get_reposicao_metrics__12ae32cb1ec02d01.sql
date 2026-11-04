CREATE OR REPLACE FUNCTION public.fn_get_reposicao_metrics()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_hoje int; v_7d int; v_15d int; v_30d int;
  v_top_supplier text; v_top_count int;
  v_ativas int; v_aguardando int; v_pct_ativas numeric;
  v_total_vars int; v_data_min date; v_dias_hist int;
BEGIN
  SELECT
    COUNT(DISTINCT CASE WHEN sd.summary_date = v_today       THEN sd.product_id END),
    COUNT(DISTINCT CASE WHEN sd.summary_date >= v_today - 7  THEN sd.product_id END),
    COUNT(DISTINCT CASE WHEN sd.summary_date >= v_today - 15 THEN sd.product_id END),
    COUNT(DISTINCT CASE WHEN sd.summary_date >= v_today - 30 THEN sd.product_id END),
    MIN(sd.summary_date), (v_today - MIN(sd.summary_date))
  INTO v_hoje, v_7d, v_15d, v_30d, v_data_min, v_dias_hist
  FROM stock_daily_summary sd JOIN products p ON p.id = sd.product_id
  WHERE sd.restock_zero_to_positive = true AND sd.summary_date >= v_today - 30
    AND sd.stock_close > 0 AND p.is_active = true;

  SELECT s.name, COUNT(DISTINCT sd.product_id) INTO v_top_supplier, v_top_count
  FROM stock_daily_summary sd JOIN suppliers s ON s.id = sd.supplier_id
  JOIN products p ON p.id = sd.product_id
  WHERE sd.restock_zero_to_positive = true AND sd.summary_date >= v_today - 7
    AND sd.stock_close > 0 AND p.is_active = true
  GROUP BY s.name ORDER BY COUNT(DISTINCT sd.product_id) DESC LIMIT 1;

  SELECT COUNT(*) INTO v_total_vars FROM product_variants WHERE is_active = true;

  SELECT
    COUNT(*) FILTER (WHERE pv.stock_quantity = 0 AND pv.next_date_1 IS NOT NULL AND pv.next_date_1 > v_today),
    COUNT(*) FILTER (WHERE pv.next_date_1 IS NOT NULL AND pv.next_date_1 > v_today)
  INTO v_ativas, v_aguardando FROM product_variants pv WHERE pv.is_active = true;

  v_pct_ativas := ROUND(100.0 * v_ativas / NULLIF(v_total_vars, 0), 1);

  RETURN jsonb_build_object(
    'dias_historico_real', v_dias_hist, 'data_inicio_historico', v_data_min,
    'aviso_historico', CASE WHEN v_dias_hist < 30
      THEN 'Histórico incompleto: ' || v_dias_hist::text || ' dias disponíveis (meta: 30)'
      ELSE 'OK' END,
    'repostos_hoje', v_hoje, 'repostos_7d', v_7d, 'repostos_15d', v_15d, 'repostos_30d', v_30d,
    '7d_igual_15d_aviso', (v_7d = v_15d AND v_dias_hist < 15),
    'top_supplier_nome', v_top_supplier, 'top_supplier_count', v_top_count,
    'variacoes_ativas_zero_com_previsao', v_ativas, 'variacoes_aguardando_lote', v_aguardando,
    'pct_variacoes_com_reposicao', v_pct_ativas, 'gerado_em', now(), 'versao', 'v3_stable_20260619'
  );
END;
$function$
