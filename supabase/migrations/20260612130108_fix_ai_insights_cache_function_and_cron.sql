
-- FIX #4: Criar função que gera e cacheia insights de mercado com base em dados reais
-- Elimina latência de 3-10s ao abrir o módulo (cache com TTL de 6h)

CREATE OR REPLACE FUNCTION public.fn_generate_market_insights_cache(
  p_user_id uuid,
  p_days integer DEFAULT 30,
  p_category_id uuid DEFAULT NULL,
  p_supplier_id uuid DEFAULT NULL,
  p_product_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'analytics'
AS $function$
DECLARE
  v_cache_key text;
  v_insights jsonb;
  v_kpis jsonb;
  v_market jsonb;
  v_action text;
  v_reason text;
  v_changed text;
  
  -- KPIs comerciais
  v_total_orders  integer;
  v_total_quotes  integer;
  v_revenue       numeric;
  v_conversion    numeric;
  v_ticket_avg    numeric;
  
  -- Market data
  v_products_hot     integer;
  v_products_risk    integer;
  v_products_stagnant integer;
  v_total_stock      bigint;
  v_avg_velocity     numeric;
  v_demand_label     text;
BEGIN
  -- Gerar cache_key baseado nos parâmetros
  v_cache_key := 'market_insights_' || p_days || '_' ||
    COALESCE(p_category_id::text, 'all') || '_' ||
    COALESCE(p_supplier_id::text, 'all') || '_' ||
    COALESCE(p_product_id::text, 'all');

  -- Verificar se cache válido existe (TTL 6h)
  IF EXISTS (
    SELECT 1 FROM ai_insights_cache
    WHERE user_id = p_user_id
      AND cache_key = v_cache_key
      AND expires_at > now()
  ) THEN
    -- Retornar cache existente
    SELECT payload INTO v_insights
    FROM ai_insights_cache
    WHERE user_id = p_user_id
      AND cache_key = v_cache_key
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;
    RETURN v_insights;
  END IF;

  -- Calcular KPIs comerciais (últimos p_days)
  SELECT 
    COUNT(*)::integer,
    COALESCE(SUM(total), 0),
    COALESCE(AVG(total), 0)
  INTO v_total_orders, v_revenue, v_ticket_avg
  FROM orders
  WHERE created_at >= CURRENT_DATE - p_days
    AND status NOT IN ('cancelled');

  SELECT COUNT(*)::integer INTO v_total_quotes
  FROM quotes
  WHERE created_at >= CURRENT_DATE - p_days;

  v_conversion := CASE WHEN v_total_quotes > 0 
    THEN ROUND((v_total_orders::numeric / v_total_quotes) * 100, 0) ELSE 0 END;

  -- Calcular inteligência de mercado
  SELECT 
    COUNT(CASE WHEN is_hot_product THEN 1 END)::integer,
    COUNT(CASE WHEN is_stockout_risk THEN 1 END)::integer,
    COUNT(CASE WHEN is_stagnant THEN 1 END)::integer,
    COALESCE(SUM(total_current_stock), 0),
    COALESCE(ROUND(AVG(avg_depletion_30d) FILTER (WHERE avg_depletion_30d > 0), 1), 0)
  INTO v_products_hot, v_products_risk, v_products_stagnant, v_total_stock, v_avg_velocity
  FROM analytics.mv_product_intelligence;

  -- Gerar labels contextuais
  v_demand_label := CASE
    WHEN v_avg_velocity >= 100 THEN 'Muito Alta'
    WHEN v_avg_velocity >= 50  THEN 'Alta'
    WHEN v_avg_velocity >= 10  THEN 'Normal'
    WHEN v_avg_velocity > 0    THEN 'Baixa'
    ELSE 'Em análise'
  END;

  -- Gerar texto de insights baseado nos dados reais
  v_changed := format(
    'Faturamento de %s nos últimos %s dias com %s pedidos (ticket médio %s). Conversão orçamento→pedido: %s%%.',
    'R$ ' || to_char(v_revenue, 'FM999,999,990.00'),
    p_days,
    v_total_orders,
    'R$ ' || to_char(v_ticket_avg, 'FM999,999,990.00'),
    v_conversion
  );

  v_reason := format(
    'Demanda de mercado classificada como "%s" com velocidade média de %.1f unidades/dia. %s produtos em risco de ruptura e %s estagnados identificados.',
    v_demand_label,
    v_avg_velocity,
    v_products_risk,
    v_products_stagnant
  );

  v_action := CASE
    WHEN v_conversion = 0 AND v_total_quotes > 0 THEN
      format('Conversão 0%% — %s orçamentos abertos. Ative follow-up nos orçamentos pendentes para destravar pedidos.', v_total_quotes)
    WHEN v_conversion < 30 AND v_total_quotes > 0 THEN
      format('Conversão de %s%% abaixo da meta. Priorize os %s orçamentos com maior valor para acelerar fechamentos.', v_conversion, v_total_quotes - v_total_orders)
    WHEN v_products_risk > 50 THEN
      format('%s produtos com risco de ruptura. Acione reposição prioritária nos fornecedores para os itens da curva A.', v_products_risk)
    WHEN v_products_stagnant > 200 THEN
      format('%s produtos estagnados com alto estoque. Avalie ações promocionais ou renegociação com fornecedores.', v_products_stagnant)
    ELSE
      'Pipeline comercial saudável. Foque em expandir prospecção de novos clientes e aumentar o ticket médio nos pedidos.'
  END;

  -- Montar payload de insights
  v_insights := jsonb_build_object(
    'gerado_em', now(),
    'periodo_dias', p_days,
    'dados_base', jsonb_build_object(
      'pedidos', v_total_orders,
      'orcamentos', v_total_quotes,
      'faturamento', v_revenue,
      'ticket_medio', v_ticket_avg,
      'conversao_pct', v_conversion,
      'produtos_hot', v_products_hot,
      'produtos_risco', v_products_risk,
      'produtos_estagnados', v_products_stagnant,
      'estoque_total', v_total_stock,
      'velocidade_media', v_avg_velocity
    ),
    'insights', jsonb_build_object(
      'o_que_mudou', v_changed,
      'por_que', v_reason,
      'proxima_acao', v_action,
      'demanda', v_demand_label
    ),
    'fonte', 'fn_generate_market_insights_cache_v1'
  );

  -- Salvar no cache (TTL 6h, sobrescrever se existir)
  DELETE FROM ai_insights_cache
  WHERE user_id = p_user_id AND cache_key = v_cache_key;

  INSERT INTO ai_insights_cache (
    user_id, function_name, cache_key, payload,
    model, tokens_input, tokens_output, duration_ms,
    expires_at
  ) VALUES (
    p_user_id,
    'fn_generate_market_insights_cache',
    v_cache_key,
    v_insights,
    'db_computed_v1',
    0, 0, 0,
    now() + INTERVAL '6 hours'
  );

  RETURN v_insights;
END;
$function$;

-- Revogar acesso público, conceder a service_role e authenticated
REVOKE ALL ON FUNCTION public.fn_generate_market_insights_cache(uuid, integer, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_generate_market_insights_cache(uuid, integer, uuid, uuid, uuid) TO authenticated, service_role;

-- Cron job: pré-gerar insights a cada 6h (para o admin principal Joaquim)
-- Horários escalonados: 01:00, 07:00, 13:00, 19:00 UTC
SELECT cron.schedule(
  'pre-generate-market-insights',
  '0 1,7,13,19 * * *',
  $$SELECT public.fn_generate_market_insights_cache('75921d8b-611f-4413-9ce5-afccdb733d26'::uuid, 30);$$
);
;
