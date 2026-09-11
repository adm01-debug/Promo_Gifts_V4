
-- FIX A: Substituir now() por clock_timestamp() nos blocos UPSERT de cache.
-- now() retorna o início da transação (fixo). clock_timestamp() retorna
-- o tempo real no momento da chamada — garante TTL correto mesmo quando
-- a função é invocada múltiplas vezes dentro da mesma transação.

-- ─── A1: fn_generate_market_insights_cache ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_generate_market_insights_cache(
    p_user_id uuid,
    p_days integer DEFAULT 30,
    p_category_id uuid DEFAULT NULL::uuid,
    p_supplier_id uuid DEFAULT NULL::uuid,
    p_product_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'analytics'
AS $function$
DECLARE
  v_cache_key   text;
  v_insights    jsonb;
  v_changed     text;
  v_reason      text;
  v_action      text;
  v_demand_label text;

  v_total_orders   integer;
  v_total_quotes   integer;
  v_revenue        numeric;
  v_ticket_avg     numeric;
  v_conversion     numeric;

  v_products_hot      integer;
  v_products_risk     integer;
  v_products_stagnant integer;
  v_total_stock       bigint;
  v_avg_velocity      numeric;
BEGIN
  v_cache_key := 'market_insights_' || p_days || '_' ||
    COALESCE(p_category_id::text, 'all') || '_' ||
    COALESCE(p_supplier_id::text, 'all') || '_' ||
    COALESCE(p_product_id::text, 'all');

  -- TTL check usa now() (tempo de transação) — correto para hit check
  IF EXISTS (
    SELECT 1 FROM ai_insights_cache
    WHERE user_id = p_user_id AND cache_key = v_cache_key AND expires_at > now()
  ) THEN
    SELECT payload INTO v_insights
    FROM ai_insights_cache
    WHERE user_id = p_user_id AND cache_key = v_cache_key AND expires_at > now()
    ORDER BY created_at DESC LIMIT 1;
    RETURN v_insights;
  END IF;

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

  SELECT
    COUNT(CASE WHEN is_hot_product THEN 1 END)::integer,
    COUNT(CASE WHEN is_stockout_risk THEN 1 END)::integer,
    COUNT(CASE WHEN is_stagnant THEN 1 END)::integer,
    COALESCE(SUM(total_current_stock), 0),
    COALESCE(ROUND(AVG(avg_depletion_30d) FILTER (WHERE avg_depletion_30d > 0), 1), 0)
  INTO v_products_hot, v_products_risk, v_products_stagnant, v_total_stock, v_avg_velocity
  FROM analytics.mv_product_intelligence;

  v_demand_label := CASE
    WHEN v_avg_velocity >= 100 THEN 'Muito Alta'
    WHEN v_avg_velocity >= 50  THEN 'Alta'
    WHEN v_avg_velocity >= 10  THEN 'Normal'
    WHEN v_avg_velocity >  0   THEN 'Baixa'
    ELSE 'Em análise'
  END;

  v_changed := 'Faturamento de R$ ' || to_char(v_revenue, 'FM999,999,990.00') ||
    ' nos últimos ' || p_days || ' dias com ' || v_total_orders ||
    ' pedidos (ticket médio R$ ' || to_char(v_ticket_avg, 'FM999,999,990.00') ||
    '). Conversão orçamento→pedido: ' || v_conversion || '%.';

  v_reason := 'Demanda de mercado classificada como "' || v_demand_label ||
    '" com velocidade média de ' || ROUND(v_avg_velocity, 1)::text ||
    ' unidades/dia. ' || v_products_risk || ' produtos em risco de ruptura e ' ||
    v_products_stagnant || ' estagnados identificados.';

  v_action := CASE
    WHEN v_conversion = 0 AND v_total_quotes > 0 THEN
      'Conversão 0% — ' || v_total_quotes ||
      ' orçamentos abertos. Ative follow-up nos orçamentos pendentes para destravar pedidos.'
    WHEN v_conversion < 30 AND v_total_quotes > 0 THEN
      'Conversão de ' || v_conversion ||
      '% abaixo da meta. Priorize os orçamentos com maior valor para acelerar fechamentos.'
    WHEN v_products_risk > 50 THEN
      v_products_risk ||
      ' produtos com risco de ruptura. Acione reposição prioritária na curva A.'
    WHEN v_products_stagnant > 200 THEN
      v_products_stagnant ||
      ' produtos estagnados. Avalie ações promocionais ou renegociação com fornecedores.'
    ELSE
      'Pipeline saudável. Expanda prospecção de novos clientes e aumente o ticket médio.'
  END;

  v_insights := jsonb_build_object(
    'gerado_em',   now(),
    'periodo_dias', p_days,
    'dados_base', jsonb_build_object(
      'pedidos',             v_total_orders,
      'orcamentos',          v_total_quotes,
      'faturamento',         v_revenue,
      'ticket_medio',        v_ticket_avg,
      'conversao_pct',       v_conversion,
      'produtos_hot',        v_products_hot,
      'produtos_risco',      v_products_risk,
      'produtos_estagnados', v_products_stagnant,
      'estoque_total',       v_total_stock,
      'velocidade_media',    v_avg_velocity
    ),
    'insights', jsonb_build_object(
      'o_que_mudou',  v_changed,
      'por_que',      v_reason,
      'proxima_acao', v_action,
      'demanda',      v_demand_label
    ),
    'fonte', 'fn_generate_market_insights_cache_v1'
  );

  -- UPSERT com clock_timestamp(): TTL correto mesmo em multi-call intra-transação
  INSERT INTO ai_insights_cache (
    user_id, function_name, cache_key, payload,
    model, duration_ms, expires_at
  ) VALUES (
    p_user_id, 'fn_generate_market_insights_cache',
    v_cache_key, v_insights,
    'db_computed_v1', 0,
    clock_timestamp() + INTERVAL '6 hours'
  )
  ON CONFLICT (user_id, function_name, cache_key)
  DO UPDATE SET
    payload    = EXCLUDED.payload,
    created_at = clock_timestamp(),
    expires_at = clock_timestamp() + INTERVAL '6 hours';

  RETURN v_insights;
END;
$function$;

-- ─── A2: fn_generate_trends_insights ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_generate_trends_insights(p_user_id uuid, p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id  uuid;
  v_cache_key  text;
  v_cached     jsonb;
  v_insights   jsonb;
  v_since      timestamptz;
  v_since_prev timestamptz;
  v_views_now    bigint; v_prods_now    bigint;
  v_searches_now bigint; v_terms_now    bigint;
  v_views_prev   bigint; v_prods_prev   bigint;
  v_searches_prev bigint; v_terms_prev  bigint;
BEGIN
  v_caller_id := auth.uid();

  IF p_user_id IS NOT NULL
     AND p_user_id != v_caller_id
     AND NOT is_manager_or_admin()
  THEN
    RETURN jsonb_build_object(
      'error', 'Acesso negado: apenas managers e admins podem visualizar dados de outros usuários',
      'totals', jsonb_build_object('views',0,'searches',0,'unique_terms',0,'unique_products',0,
                                   'views_growth_pct',null,'searches_growth_pct',null),
      'top_products','[]'::jsonb,'top_searches','[]'::jsonb,
      'repressed_demand','[]'::jsonb,'period_days',p_days,'generated_at',NOW()
    );
  END IF;

  p_days      := GREATEST(1, LEAST(COALESCE(p_days, 30), 999));
  -- now() para ranges de data (transação-scoped é correto para consistência de query)
  v_since     := NOW() - (p_days || ' days')::interval;
  v_since_prev:= NOW() - (p_days * 2 || ' days')::interval;
  -- cache_key baseado na hora atual (now() correto — granularidade de 1h é intencional)
  v_cache_key := 'trends_' || p_days || '_' || TO_CHAR(NOW(), 'YYYY-MM-DD-HH24');

  IF p_user_id IS NOT NULL THEN
    SELECT payload INTO v_cached
    FROM public.ai_insights_cache
    WHERE user_id = p_user_id AND function_name = 'fn_generate_trends_insights'
      AND cache_key = v_cache_key AND expires_at > NOW()
    LIMIT 1;
    IF FOUND AND v_cached IS NOT NULL THEN RETURN v_cached; END IF;
  END IF;

  SELECT COUNT(*)::bigint, COUNT(DISTINCT product_id)::bigint
  INTO v_views_now, v_prods_now
  FROM public.product_views
  WHERE created_at >= v_since
    AND (p_user_id IS NULL OR seller_id = p_user_id);

  SELECT COUNT(*)::bigint, COUNT(DISTINCT search_term)::bigint
  INTO v_searches_now, v_terms_now
  FROM public.search_analytics WHERE created_at >= v_since;

  SELECT COUNT(*)::bigint, COUNT(DISTINCT product_id)::bigint
  INTO v_views_prev, v_prods_prev
  FROM public.product_views
  WHERE created_at >= v_since_prev AND created_at < v_since
    AND (p_user_id IS NULL OR seller_id = p_user_id);

  SELECT COUNT(*)::bigint, COUNT(DISTINCT search_term)::bigint
  INTO v_searches_prev, v_terms_prev
  FROM public.search_analytics
  WHERE created_at >= v_since_prev AND created_at < v_since;

  SELECT jsonb_build_object(
    'totals', jsonb_build_object(
      'views', v_views_now, 'searches', v_searches_now,
      'unique_terms', v_terms_now, 'unique_products', v_prods_now,
      'views_growth_pct', CASE WHEN v_views_prev=0 THEN NULL
        ELSE ROUND(100.0*(v_views_now-v_views_prev)::numeric/v_views_prev,1) END,
      'searches_growth_pct', CASE WHEN v_searches_prev=0 THEN NULL
        ELSE ROUND(100.0*(v_searches_now-v_searches_prev)::numeric/v_searches_prev,1) END,
      'unique_products_growth_pct', CASE WHEN v_prods_prev=0 THEN NULL
        ELSE ROUND(100.0*(v_prods_now-v_prods_prev)::numeric/v_prods_prev,1) END,
      'unique_terms_growth_pct', CASE WHEN v_terms_prev=0 THEN NULL
        ELSE ROUND(100.0*(v_terms_now-v_terms_prev)::numeric/v_terms_prev,1) END,
      'prev_period_views', v_views_prev,
      'prev_period_searches', v_searches_prev
    ),
    'top_products', COALESCE((
      SELECT jsonb_agg(sub ORDER BY (sub->>'view_count')::bigint DESC)
      FROM (
        SELECT jsonb_build_object(
          'product_id', pv.product_id,'view_count', COUNT(*),'product_name', MAX(p.name)
        ) AS sub
        FROM public.product_views pv
        LEFT JOIN public.products p ON p.id = pv.product_id
        WHERE pv.created_at >= v_since
          AND (p_user_id IS NULL OR pv.seller_id = p_user_id)
        GROUP BY pv.product_id ORDER BY COUNT(*) DESC LIMIT 10
      ) x
    ), '[]'::jsonb),
    'top_searches', COALESCE((
      SELECT jsonb_agg(sub ORDER BY (sub->>'count')::int DESC)
      FROM (
        SELECT jsonb_build_object(
          'term', search_term, 'count', COUNT(*),
          'zero_pct', ROUND(100.0*SUM(CASE WHEN results_count=0 THEN 1 ELSE 0 END)
                      /NULLIF(COUNT(*) FILTER (WHERE results_count != -1),0),1),
          'zero_results', SUM(CASE WHEN results_count=0 THEN 1 ELSE 0 END)
        ) AS sub
        FROM public.search_analytics
        WHERE created_at >= v_since AND results_count != -1
        GROUP BY search_term ORDER BY COUNT(*) DESC LIMIT 10
      ) x
    ), '[]'::jsonb),
    'repressed_demand', COALESCE((
      SELECT jsonb_agg(sub ORDER BY (sub->>'zero_result_searches')::int DESC)
      FROM (
        SELECT jsonb_build_object(
          'term', search_term,
          'searches', COUNT(*) FILTER (WHERE results_count != -1),
          'zero_result_searches', SUM(CASE WHEN results_count=0 THEN 1 ELSE 0 END)
        ) AS sub
        FROM public.search_analytics
        WHERE created_at >= v_since
        GROUP BY search_term
        HAVING SUM(CASE WHEN results_count=0 THEN 1 ELSE 0 END) > 0
        ORDER BY SUM(CASE WHEN results_count=0 THEN 1 ELSE 0 END) DESC LIMIT 10
      ) x
    ), '[]'::jsonb),
    'period_days', p_days, 'generated_at', NOW()
  ) INTO v_insights;

  IF p_user_id IS NOT NULL THEN
    -- clock_timestamp() garante TTL preciso mesmo em chamadas múltiplas intra-transação
    INSERT INTO public.ai_insights_cache (
      user_id, function_name, cache_key, payload,
      model, duration_ms, created_at, expires_at
    ) VALUES (
      p_user_id, 'fn_generate_trends_insights', v_cache_key, v_insights,
      'postgres_aggregation', 0, clock_timestamp(), clock_timestamp() + INTERVAL '6 hours'
    )
    ON CONFLICT (user_id, function_name, cache_key)
    DO UPDATE SET payload=EXCLUDED.payload,
      created_at=clock_timestamp(), expires_at=clock_timestamp()+INTERVAL '6 hours';
  END IF;

  RETURN v_insights;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error', SQLERRM,
    'totals', jsonb_build_object(
      'views',0,'searches',0,'unique_terms',0,'unique_products',0,
      'views_growth_pct',null,'searches_growth_pct',null
    ),
    'top_products','[]'::jsonb,'top_searches','[]'::jsonb,
    'repressed_demand','[]'::jsonb,'period_days',p_days,'generated_at',NOW()
  );
END;
$function$;
;
