
-- Criar função que conecta navigation_analytics ao módulo Tendências
-- Fornece padrões de navegação: quais páginas os usuários visitam mais
-- e de onde saem (bounce patterns)

CREATE OR REPLACE FUNCTION public.fn_get_navigation_patterns(
  p_user_id uuid DEFAULT NULL,
  p_days    integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_since   timestamptz;
  v_result  jsonb;
BEGIN
  IF p_user_id IS NOT NULL
     AND p_user_id != auth.uid()
     AND NOT is_manager_or_admin()
  THEN
    RETURN jsonb_build_object('error','Acesso negado');
  END IF;

  p_days  := GREATEST(1, LEAST(COALESCE(p_days, 30), 999));
  v_since := NOW() - (p_days || ' days')::interval;

  WITH nav_events AS (
    SELECT
      event_type,
      event_data->>'source_path'      AS source_path,
      event_data->>'destination_path' AS destination_path,
      event_data->>'button_name'      AS button_name,
      created_at
    FROM public.navigation_analytics
    WHERE created_at >= v_since
      AND (p_user_id IS NULL OR user_id = p_user_id)
  ),
  -- Páginas de origem mais comuns
  top_sources AS (
    SELECT source_path, COUNT(*) AS hits
    FROM nav_events
    WHERE source_path IS NOT NULL
    GROUP BY source_path
    ORDER BY hits DESC
    LIMIT 10
  ),
  -- Botões mais clicados
  top_buttons AS (
    SELECT button_name, COUNT(*) AS hits
    FROM nav_events
    WHERE button_name IS NOT NULL
    GROUP BY button_name
    ORDER BY hits DESC
    LIMIT 10
  ),
  -- Saídas de páginas de produto (product bounce)
  product_bounces AS (
    SELECT
      COUNT(*) FILTER (WHERE source_path LIKE '/produto/%') AS saidas_de_produto,
      COUNT(*) FILTER (WHERE source_path LIKE '/produto/%'
                         AND destination_path = '/') AS retorno_para_home,
      COUNT(*) FILTER (WHERE source_path = '/orcamentos/novo') AS saidas_de_orcamento
    FROM nav_events
  )
  SELECT jsonb_build_object(
    'period_days',   p_days,
    'generated_at',  NOW(),
    'total_events',  (SELECT COUNT(*) FROM nav_events),
    'top_sources',   (SELECT jsonb_agg(jsonb_build_object('path', source_path, 'hits', hits) ORDER BY hits DESC) FROM top_sources),
    'top_buttons',   (SELECT jsonb_agg(jsonb_build_object('button', button_name, 'hits', hits) ORDER BY hits DESC) FROM top_buttons),
    'product_navigation', jsonb_build_object(
      'exits_from_product_pages',  (SELECT saidas_de_produto FROM product_bounces),
      'returned_to_home',          (SELECT retorno_para_home FROM product_bounces),
      'exits_from_quote_creation', (SELECT saidas_de_orcamento FROM product_bounces)
    )
  ) INTO v_result;

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_navigation_patterns(uuid, integer)
  TO authenticated, service_role;

-- Criar índice para navigation_analytics (sem nenhum até agora)
CREATE INDEX IF NOT EXISTS idx_navigation_analytics_created_at
  ON public.navigation_analytics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_navigation_analytics_user_created
  ON public.navigation_analytics(user_id, created_at DESC);

-- Adicionar navigation_analytics ao cron de ANALYZE semanal
-- (já foi adicionado em P1-A, confirmar)
SELECT 'navigation_analytics integrada ao módulo Tendências' as status;
;
