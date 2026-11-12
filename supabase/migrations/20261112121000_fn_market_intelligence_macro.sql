-- Bug #57 (market-intel): o grafico de mercado (/inteligencia-comercial, MarketIntelligenceChart)
-- lia stock_daily_summary cru via PostgREST, sem filtro de data e ordem crescente. O max-rows (1000)
-- devolvia as linhas mais antigas do historico (~2,84M linhas, retencao permanente), todas descartadas
-- no cliente pelo corte de data -> daily vazio -> tela mostrava o mock como se fosse dado real.
-- Correcao de causa raiz: agregar no banco por (summary_date, supplier_id) dentro da janela pedida.
-- Retorno jsonb (um unico valor) para nao ser cortado pelo max-rows (360 dias x N fornecedores > 1000).
--
-- Menor privilegio: SECURITY INVOKER. A tabela ja e legivel por todo authenticated
-- (policy auth_read_stock_daily_summary USING true; GRANT SELECT authenticated) e a rota e
-- ProtectedRoute para todos os logados; a funcao nao amplia acesso, so agrega o que o chamador
-- ja pode ler. Mesmo padrao de public.fn_product_market_intelligence (INVOKER, exec authenticated).
-- anon nao executa (REVOKE explicito, pois o default privileges do Supabase concede a anon).
--
-- Rollback: DROP FUNCTION IF EXISTS public.fn_market_intelligence_macro(integer, uuid);
--           (arquivo: supabase/rollbacks/20261112121000_rollback.sql)
--
-- Performance: NAO MEDIDA. Sem p_supplier_id nao ha indice utilizavel com summary_date na frente
-- (idx_sds_cenario_a e idx_sds_zero_to_positive sao parciais) -> seq scan em ~2,84M linhas sob o
-- statement_timeout de authenticated. Antes de mergear o front: EXPLAIN (ANALYZE, BUFFERS) como
-- authenticated com p_days=360, p_supplier_id NULL; tempo registrado na PR. Se perto do timeout,
-- indice (summary_date, supplier_id) INCLUDE (...) criado de forma concorrente em migration separada
-- (com opt-out nao-transacional no cabecalho dela), com aprovacao do dono, antes deste front.

CREATE OR REPLACE FUNCTION public.fn_market_intelligence_macro(
  p_days integer DEFAULT 30,
  p_supplier_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'summary_date', a.summary_date,
        'supplier_id', a.supplier_id,
        'stock_close', a.stock_close,
        'units_depleted', a.units_depleted,
        'units_restocked', a.units_restocked
      )
      ORDER BY a.summary_date, a.supplier_id
    ),
    '[]'::jsonb
  )
  FROM (
    SELECT
      s.summary_date,
      s.supplier_id,
      SUM(COALESCE(s.stock_close, 0))::bigint     AS stock_close,
      SUM(COALESCE(s.units_depleted, 0))::bigint  AS units_depleted,
      SUM(COALESCE(s.units_restocked, 0))::bigint AS units_restocked
    FROM public.stock_daily_summary s
    WHERE s.summary_date >= CURRENT_DATE - LEAST(GREATEST(COALESCE(p_days, 30), 1), 366)
      AND (p_supplier_id IS NULL OR s.supplier_id = p_supplier_id)
    GROUP BY s.summary_date, s.supplier_id
  ) a
$$;

COMMENT ON FUNCTION public.fn_market_intelligence_macro(integer, uuid) IS
  'Inteligencia de mercado macro: stock_daily_summary somado por (summary_date, supplier_id) nos ultimos p_days (1..366), filtro opcional por fornecedor. SECURITY INVOKER (respeita RLS). Consumida por useMarketIntelligenceMacro.';

REVOKE ALL ON FUNCTION public.fn_market_intelligence_macro(integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_market_intelligence_macro(integer, uuid) TO authenticated, service_role;
