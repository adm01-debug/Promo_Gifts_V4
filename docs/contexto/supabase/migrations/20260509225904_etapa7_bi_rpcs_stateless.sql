-- ============================================================
-- Etapa 7: BI/Trends — 3 RPCs stateless (sem tabelas dedicadas)
-- 
-- Decisão arquitetural: sistema BI é puramente computacional, agregando
-- on-the-fly de orders/order_items (jobs reais) e quotes/quote_items
-- (histórico de orçamentos). Os hooks fallback para mocks quando vazio.
-- 
-- Tabelas planejadas (bi_dossiers, trends_cache, sales_metrics) NÃO existem
-- no código e NÃO serão criadas — todas as métricas são stateless.
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- RPC 1: get_industry_top_products
-- Top produtos vendidos para empresas de um conjunto de IDs (mesmo ramo)
-- Source: orders + order_items
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_industry_top_products(
  _company_ids uuid[],
  _days        integer DEFAULT 90,
  _limit       integer DEFAULT 10
)
RETURNS TABLE (
  product_id          uuid,
  product_name        text,
  product_image_url   text,
  total_quantity      bigint,
  unique_clients      bigint,
  unique_sellers      bigint,
  total_revenue       numeric,
  avg_unit_price      numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    oi.product_id,
    oi.product_name,
    oi.product_image_url,
    SUM(oi.quantity)::bigint                                AS total_quantity,
    COUNT(DISTINCT o.client_id)::bigint                     AS unique_clients,
    COUNT(DISTINCT o.seller_id)::bigint                     AS unique_sellers,
    COALESCE(SUM(oi.quantity * oi.unit_price), 0)::numeric  AS total_revenue,
    COALESCE(AVG(oi.unit_price), 0)::numeric                AS avg_unit_price
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  WHERE o.client_id = ANY(_company_ids)
    AND o.status IS DISTINCT FROM 'cancelled'
    AND o.status IS DISTINCT FROM 'draft'
    AND o.created_at >= now() - make_interval(days => _days)
  GROUP BY oi.product_id, oi.product_name, oi.product_image_url
  ORDER BY SUM(oi.quantity) DESC
  LIMIT _limit
$$;

GRANT EXECUTE ON FUNCTION public.get_industry_top_products(uuid[], integer, integer) TO authenticated;

COMMENT ON FUNCTION public.get_industry_top_products IS
  'Agrega top produtos do setor a partir de orders+order_items. SECURITY DEFINER pq vendedor precisa ver agregados de clientes do mesmo ramo (atravessa RLS). Retorna apenas dados agregados — nomes de clientes individuais NÃO são expostos.';

-- ════════════════════════════════════════════════════════════
-- RPC 2: get_client_top_products
-- Top produtos orçados por um cliente específico (afinidade)
-- Source: quotes + quote_items
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_client_top_products(
  _client_id uuid,
  _limit     integer DEFAULT 15
)
RETURNS TABLE (
  product_id          uuid,
  product_name        text,
  product_image_url   text,
  total_quantity      bigint,
  occurrences         bigint,
  total_revenue       numeric,
  avg_unit_price      numeric,
  last_quoted_at      timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    qi.product_id,
    qi.product_name,
    qi.product_image_url,
    SUM(qi.quantity)::bigint                                AS total_quantity,
    COUNT(DISTINCT q.id)::bigint                            AS occurrences,
    COALESCE(SUM(qi.quantity * qi.unit_price), 0)::numeric  AS total_revenue,
    COALESCE(AVG(qi.unit_price), 0)::numeric                AS avg_unit_price,
    MAX(q.created_at)                                       AS last_quoted_at
  FROM public.quotes q
  JOIN public.quote_items qi ON qi.quote_id = q.id
  WHERE q.client_id = _client_id
    AND q.status IS DISTINCT FROM 'cancelled'
    AND q.status IS DISTINCT FROM 'rejected'
  GROUP BY qi.product_id, qi.product_name, qi.product_image_url
  ORDER BY SUM(qi.quantity) DESC
  LIMIT _limit
$$;

GRANT EXECUTE ON FUNCTION public.get_client_top_products(uuid, integer) TO authenticated;

COMMENT ON FUNCTION public.get_client_top_products IS
  'Top produtos já orçados por um cliente. Source: quote_items joinado com quotes. SECURITY DEFINER: respeito de privacidade fica na camada do app (vendedor só pede client_id de cliente que ele acessa via CRM).';

-- ════════════════════════════════════════════════════════════
-- RPC 3: get_industry_benchmark_stats
-- Estatísticas comparativas para benchmark cliente vs setor
-- Source: quotes + quote_items
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_industry_benchmark_stats(
  _company_ids uuid[],
  _days        integer DEFAULT 180
)
RETURNS TABLE (
  total_clients_sampled    integer,
  avg_ltv                  numeric,
  avg_ticket               numeric,
  avg_quotes_per_client    numeric,
  avg_items_per_quote      numeric,
  top_product_name         text,
  total_revenue            numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_top_product_name text;
BEGIN
  -- Top produto pré-calculado (subquery isolada)
  SELECT qi.product_name INTO v_top_product_name
  FROM public.quote_items qi
  JOIN public.quotes q ON q.id = qi.quote_id
  WHERE q.client_id = ANY(_company_ids)
    AND q.status IS DISTINCT FROM 'cancelled'
    AND q.created_at >= now() - make_interval(days => _days)
  GROUP BY qi.product_name
  ORDER BY SUM(qi.quantity) DESC
  LIMIT 1;

  RETURN QUERY
  WITH quote_stats AS (
    SELECT 
      q.client_id,
      COUNT(*)::integer            AS quotes_count,
      COALESCE(AVG(q.total), 0)    AS avg_total,
      COALESCE(SUM(q.total), 0)    AS client_revenue
    FROM public.quotes q
    WHERE q.client_id = ANY(_company_ids)
      AND q.status IS DISTINCT FROM 'cancelled'
      AND q.status IS DISTINCT FROM 'draft'
      AND q.created_at >= now() - make_interval(days => _days)
    GROUP BY q.client_id
  ),
  items_stats AS (
    SELECT 
      q.client_id,
      AVG(item_count.cnt) AS avg_items
    FROM public.quotes q
    JOIN LATERAL (
      SELECT COUNT(*)::numeric AS cnt 
      FROM public.quote_items qi 
      WHERE qi.quote_id = q.id
    ) item_count ON true
    WHERE q.client_id = ANY(_company_ids)
      AND q.created_at >= now() - make_interval(days => _days)
    GROUP BY q.client_id
  )
  SELECT 
    COUNT(DISTINCT qs.client_id)::integer       AS total_clients_sampled,
    COALESCE(AVG(qs.client_revenue), 0)::numeric AS avg_ltv,
    COALESCE(AVG(qs.avg_total), 0)::numeric      AS avg_ticket,
    COALESCE(AVG(qs.quotes_count), 0)::numeric   AS avg_quotes_per_client,
    COALESCE(AVG(its.avg_items), 0)::numeric     AS avg_items_per_quote,
    v_top_product_name                           AS top_product_name,
    COALESCE(SUM(qs.client_revenue), 0)::numeric AS total_revenue
  FROM quote_stats qs
  LEFT JOIN items_stats its ON its.client_id = qs.client_id;
END $$;

GRANT EXECUTE ON FUNCTION public.get_industry_benchmark_stats(uuid[], integer) TO authenticated;

COMMENT ON FUNCTION public.get_industry_benchmark_stats IS
  'Estatísticas agregadas do setor (LTV médio, ticket médio, frequência) para benchmark cliente vs setor. Retorna 1 row com agregados — não expõe dados de clientes individuais. Usada pelo useClientVsIndustry.';
