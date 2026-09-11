
-- Função dedicada para o Funil de Conversão real do módulo de Tendências
-- Retorna cada etapa do funil com volume e taxa de conversão entre etapas

CREATE OR REPLACE FUNCTION public.fn_get_conversion_funnel(
  p_user_id uuid DEFAULT NULL,
  p_days    integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_since          timestamptz;
  v_since_prev     timestamptz;
  v_buscas         bigint := 0;
  v_views          bigint := 0;
  v_prods_vistos   bigint := 0;
  v_orcamentos     bigint := 0;
  v_pedidos        bigint := 0;
  -- Período anterior
  v_buscas_prev    bigint := 0;
  v_views_prev     bigint := 0;
  v_orcamentos_prev bigint := 0;
BEGIN
  -- Validação de acesso: igual à fn_generate_trends_insights
  IF p_user_id IS NOT NULL
     AND p_user_id != auth.uid()
     AND NOT is_manager_or_admin()
  THEN
    RETURN jsonb_build_object('error','Acesso negado');
  END IF;

  p_days      := GREATEST(1, LEAST(COALESCE(p_days, 30), 999));
  v_since     := NOW() - (p_days || ' days')::interval;
  v_since_prev:= NOW() - (p_days * 2 || ' days')::interval;

  -- Etapa 1: Buscas (excluindo sentinels -1)
  SELECT COUNT(*)::bigint INTO v_buscas
  FROM search_analytics
  WHERE created_at >= v_since AND results_count != -1;

  SELECT COUNT(*)::bigint INTO v_buscas_prev
  FROM search_analytics
  WHERE created_at >= v_since_prev AND created_at < v_since AND results_count != -1;

  -- Etapa 2: Visualizações de produto
  SELECT COUNT(*)::bigint, COUNT(DISTINCT product_id)::bigint
  INTO v_views, v_prods_vistos
  FROM product_views
  WHERE created_at >= v_since
    AND (p_user_id IS NULL OR seller_id = p_user_id);

  SELECT COUNT(*)::bigint INTO v_views_prev
  FROM product_views
  WHERE created_at >= v_since_prev AND created_at < v_since
    AND (p_user_id IS NULL OR seller_id = p_user_id);

  -- Etapa 3: Orçamentos criados no período
  SELECT COUNT(DISTINCT q.id)::bigint INTO v_orcamentos
  FROM quotes q
  WHERE q.created_at >= v_since
    AND (p_user_id IS NULL OR q.created_by = p_user_id OR q.assigned_to = p_user_id);

  SELECT COUNT(DISTINCT q.id)::bigint INTO v_orcamentos_prev
  FROM quotes q
  WHERE q.created_at >= v_since_prev AND q.created_at < v_since
    AND (p_user_id IS NULL OR q.created_by = p_user_id OR q.assigned_to = p_user_id);

  -- Etapa 4: Pedidos
  SELECT COUNT(*)::bigint INTO v_pedidos
  FROM orders
  WHERE created_at >= v_since
    AND (p_user_id IS NULL OR created_by = p_user_id);

  RETURN jsonb_build_object(
    'period_days', p_days,
    'generated_at', NOW(),
    'funnel', jsonb_build_array(
      jsonb_build_object(
        'step', 1, 'label', 'Buscas',
        'value', v_buscas,
        'prev_value', v_buscas_prev,
        'growth_pct', CASE WHEN v_buscas_prev=0 THEN NULL
          ELSE ROUND(100.0*(v_buscas-v_buscas_prev)::numeric/v_buscas_prev,1) END,
        'conversion_from_prev', NULL
      ),
      jsonb_build_object(
        'step', 2, 'label', 'Visualizações',
        'value', v_views,
        'prev_value', v_views_prev,
        'growth_pct', CASE WHEN v_views_prev=0 THEN NULL
          ELSE ROUND(100.0*(v_views-v_views_prev)::numeric/v_views_prev,1) END,
        -- Taxa de conversão: views por busca (views/buscas × 100)
        'conversion_from_prev', CASE WHEN v_buscas=0 THEN NULL
          ELSE ROUND(100.0*v_views/v_buscas,1) END,
        'unique_products', v_prods_vistos
      ),
      jsonb_build_object(
        'step', 3, 'label', 'Orçamentos',
        'value', v_orcamentos,
        'prev_value', v_orcamentos_prev,
        'growth_pct', CASE WHEN v_orcamentos_prev=0 THEN NULL
          ELSE ROUND(100.0*(v_orcamentos-v_orcamentos_prev)::numeric/v_orcamentos_prev,1) END,
        'conversion_from_prev', CASE WHEN v_prods_vistos=0 THEN NULL
          ELSE ROUND(100.0*v_orcamentos/v_prods_vistos,1) END
      ),
      jsonb_build_object(
        'step', 4, 'label', 'Pedidos',
        'value', v_pedidos,
        'prev_value', NULL,
        'growth_pct', NULL,
        'conversion_from_prev', CASE WHEN v_orcamentos=0 THEN NULL
          ELSE ROUND(100.0*v_pedidos/v_orcamentos,1) END
      )
    )
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'funnel', '[]'::jsonb);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_conversion_funnel(uuid, integer)
  TO authenticated, service_role;
;
