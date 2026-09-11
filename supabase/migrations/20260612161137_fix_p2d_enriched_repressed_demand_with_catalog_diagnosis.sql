
-- Criar função dedicada de Demanda Reprimida com diagnóstico de falso-zero
-- Classifica cada termo: FALSO-ZERO (produto existe, bug de busca) vs REAL (produto ausente)

CREATE OR REPLACE FUNCTION public.fn_get_repressed_demand(
  p_user_id uuid DEFAULT NULL,
  p_days    integer DEFAULT 30,
  p_limit   integer DEFAULT 20
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
  p_limit := GREATEST(1, LEAST(COALESCE(p_limit, 20), 100));
  v_since := NOW() - (p_days || ' days')::interval;

  WITH zero_terms AS (
    SELECT
      search_term,
      COUNT(*) FILTER (WHERE results_count != -1)          AS total_buscas,
      SUM(CASE WHEN results_count = 0 THEN 1 ELSE 0 END)   AS zeros,
      ROUND(
        100.0 * SUM(CASE WHEN results_count = 0 THEN 1 ELSE 0 END)
        / NULLIF(COUNT(*) FILTER (WHERE results_count != -1), 0),
        1
      ) AS pct_zero
    FROM public.search_analytics
    WHERE created_at >= v_since
    GROUP BY search_term
    HAVING SUM(CASE WHEN results_count = 0 THEN 1 ELSE 0 END) > 0
    ORDER BY SUM(CASE WHEN results_count = 0 THEN 1 ELSE 0 END) DESC
    LIMIT p_limit
  ),
  enriched AS (
    SELECT
      zt.search_term,
      zt.total_buscas,
      zt.zeros                           AS zero_result_searches,
      zt.pct_zero,
      -- Verificar via fulltext search (mesma lógica do search_products_fulltext)
      (SELECT COUNT(*)::int FROM public.products p
       WHERE p.is_active = true
         AND (p.is_deleted IS NULL OR p.is_deleted = false)
         AND p.sale_price IS NOT NULL
         AND p.search_vector @@ websearch_to_tsquery('portuguese', unaccent(zt.search_term))
      ) AS db_fulltext_count,
      -- Verificar via SKU exato
      (SELECT COUNT(*)::int FROM public.products p
       WHERE p.is_active = true
         AND (p.is_deleted IS NULL OR p.is_deleted = false)
         AND (p.sku ILIKE zt.search_term OR p.sku_promo ILIKE zt.search_term)
      ) AS db_sku_exact_count
    FROM zero_terms zt
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'term',                  e.search_term,
      'searches',              e.total_buscas,
      'zero_result_searches',  e.zero_result_searches,
      'pct_zero',              e.pct_zero,
      'db_fulltext_results',   e.db_fulltext_count,
      'db_sku_results',        e.db_sku_exact_count,
      -- Diagnóstico: FALSO (produto existe mas busca não achou) vs REAL (ausência genuína)
      'diagnosis', CASE
        WHEN e.db_fulltext_count > 0 OR e.db_sku_exact_count > 0
          THEN 'false_zero'    -- Produto existe: bug de busca no frontend
        ELSE
          'true_gap'           -- Produto genuinamente ausente: oportunidade de catálogo
        END,
      'diagnosis_label', CASE
        WHEN e.db_fulltext_count > 0 OR e.db_sku_exact_count > 0
          THEN 'Produto existe no catálogo — verificar busca do frontend'
        ELSE
          'Produto ausente — oportunidade de cadastro'
        END
    )
    ORDER BY e.zero_result_searches DESC
  ) INTO v_result
  FROM enriched e;

  RETURN jsonb_build_object(
    'period_days',  p_days,
    'generated_at', NOW(),
    'items',        COALESCE(v_result, '[]'::jsonb)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'items', '[]'::jsonb);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_repressed_demand(uuid, integer, integer)
  TO authenticated, service_role;

-- Criar índice parcial para zero-results (acelera a query de demanda reprimida)
CREATE INDEX IF NOT EXISTS idx_search_analytics_zero_results_v2
  ON public.search_analytics(search_term, created_at DESC)
  WHERE results_count = 0 AND results_count != -1;
;
