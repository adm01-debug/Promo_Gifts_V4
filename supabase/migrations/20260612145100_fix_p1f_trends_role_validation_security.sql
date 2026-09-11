
-- Adicionar validação de role: apenas manager/admin OU o próprio usuário
-- pode chamar fn_generate_trends_insights com dados de outros usuários

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
  -- P1-F: Validação de acesso
  -- Apenas: (a) chamada sem user_id = visão global para admins
  --         (b) usuário vendo seus próprios dados
  --         (c) manager/admin vendo dados de qualquer usuário
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
  v_since     := NOW() - (p_days || ' days')::interval;
  v_since_prev:= NOW() - (p_days * 2 || ' days')::interval;
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
    INSERT INTO public.ai_insights_cache (
      user_id, function_name, cache_key, payload,
      model, tokens_input, tokens_output, duration_ms, created_at, expires_at
    ) VALUES (
      p_user_id, 'fn_generate_trends_insights', v_cache_key, v_insights,
      'postgres_aggregation', 0, 0, 0, NOW(), NOW() + INTERVAL '6 hours'
    )
    ON CONFLICT (user_id, function_name, cache_key)
    DO UPDATE SET payload=EXCLUDED.payload,
      created_at=NOW(), expires_at=NOW()+INTERVAL '6 hours';
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
