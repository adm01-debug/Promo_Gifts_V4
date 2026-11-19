-- =====================================================================
-- Rollback: supabase/rollbacks/20261119220000_rollback.sql
-- =====================================================================
-- =====================================================================
-- MIGRATION: funções irmãs do painel EMA (/estoque) — restauração Onda 3
-- 2026-11-19
-- =====================================================================
-- Causa raiz (evidência):
--  A regressão da21bbf1c (gpt-engineer-bot, 2026-06-21) removeu de /estoque o
--  StockHeroRiskBanner e o WhatIfPanel, mas esses componentes sobreviveram no
--  main e NUNCA tiveram suas 3 functions SQL migradas:
--    - StockHeroRiskBanner.tsx:99  -> supabase.rpc('fn_ema_coverage_stats')       [404/PGRST202 em prod]
--    - useRupturaForecast.ts       -> supabase.rpc('fn_ruptura_forecast_7_15_30') [404/PGRST202 em prod]
--    - useWhatIfScenario.ts        -> supabase.rpc('fn_whatif_scenario')           [404/PGRST202 em prod]
--  Ausência confirmada em produção via curl (HTTP 404 para os 3 papéis).
-- Decisão: fontes reais (mv_stock_rupture_alert + variant_supplier_sources),
--  SEM dados sintéticos (regra do ADR_PIPELINE_HEALTH_CONTRATO 2026-08).
--  Nível simulado reusa EXATAMENTE a regra de classificação da MV
--  (RUPTURA stock<=0; CRÍTICO <lead; ALERTA <1.5x; ATENÇÃO <2x; senão OK).
-- Anti-regressão: anon SEM EXECUTE nas três; grants authenticated + service_role.
-- =====================================================================

-- ── 1. fn_ema_coverage_stats() ────────────────────────────────────────
-- Contrato do front (StockHeroRiskBanner.tsx):
--   CoverageStat { metric, valor, unidade, status }[]
--   metrics: pct_cobertura_ema | pct_alta_confianca | spikes_ativos
CREATE OR REPLACE FUNCTION public.fn_ema_coverage_stats()
RETURNS TABLE (
    metric  text,
    valor   numeric,
    unidade text,
    status  text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
  WITH base AS (
    SELECT a.ema_diaria, a.confidence_level, a.anomalia_spike
    FROM public.mv_stock_rupture_alert a
  )
  SELECT 'pct_cobertura_ema'::text AS metric,
         ROUND(100.0 * COUNT(*) FILTER (WHERE base.ema_diaria > 0.01) / NULLIF(COUNT(*), 0), 1),
         'pct'::text,
         CASE WHEN COUNT(*) FILTER (WHERE base.ema_diaria > 0.01) = 0
              THEN 'WARN'::text ELSE 'OK'::text END
  FROM base
  UNION ALL
  SELECT 'pct_alta_confianca'::text,
         ROUND(100.0 * COUNT(*) FILTER (WHERE base.confidence_level = 'ALTA') / NULLIF(COUNT(*), 0), 1),
         'pct'::text,
         CASE WHEN COUNT(*) FILTER (WHERE base.confidence_level = 'ALTA') = 0
              THEN 'WARN'::text ELSE 'OK'::text END
  FROM base
  UNION ALL
  SELECT 'spikes_ativos'::text,
         COUNT(*) FILTER (WHERE base.anomalia_spike)::numeric,
         'un'::text,
         CASE WHEN COUNT(*) FILTER (WHERE base.anomalia_spike) > 0
              THEN 'WARN'::text ELSE 'OK'::text END
  FROM base;
$$

ALTER FUNCTION public.fn_ema_coverage_stats() OWNER TO postgres

REVOKE ALL ON FUNCTION public.fn_ema_coverage_stats() FROM PUBLIC, anon

GRANT EXECUTE ON FUNCTION public.fn_ema_coverage_stats() TO authenticated, service_role

-- ── 2. fn_ruptura_forecast_7_15_30() ──────────────────────────────────
-- Contrato do front (useRupturaForecast.ts):
--   ForecastRow { horizonte_dias, novos_ruptura, com_restock, net_ruptura,
--                 score_medio, gap_total_un }[]
-- novos_ruptura = linhas da MV cuja cobertura <= horizonte (ainda não ruptura).
-- com_restock   = dessas, com next_quantity>0 dentro do horizonte (vss).
-- net_ruptura   = GREATEST(novos - com_restock, 0).
CREATE OR REPLACE FUNCTION public.fn_ruptura_forecast_7_15_30()
RETURNS TABLE (
    horizonte_dias integer,
    novos_ruptura  bigint,
    com_restock    bigint,
    net_ruptura    bigint,
    score_medio    numeric,
    gap_total_un   bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
  WITH alert AS (
    SELECT a.vss_id, a.cobertura_dias, a.score_composto, a.gap_unidades
    FROM public.mv_stock_rupture_alert a
  ),
  restock AS (
    SELECT vss.id AS vss_id,
           ARRAY[vss.next_quantity_1, vss.next_quantity_2, vss.next_quantity_3,
                 vss.next_quantity_4, vss.next_quantity_5, vss.next_quantity_6] AS qtys,
           ARRAY[vss.next_date_1, vss.next_date_2, vss.next_date_3,
                 vss.next_date_4, vss.next_date_5, vss.next_date_6] AS dates
    FROM public.variant_supplier_sources vss
  )
  SELECT h.horizonte_dias,
         c.novos_ruptura,
         c.com_restock,
         GREATEST(c.novos_ruptura - c.com_restock, 0) AS net_ruptura,
         c.score_medio,
         c.gap_total_un
  FROM (VALUES (7), (15), (30)) AS h(horizonte_dias)
  CROSS JOIN LATERAL (
    SELECT COUNT(*)::bigint AS novos_ruptura,
           COUNT(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM restock r, generate_subscripts(r.qtys, 1) AS s(i)
             WHERE r.vss_id = alert.vss_id
               AND r.qtys[s.i] > 0
               AND r.dates[s.i] BETWEEN CURRENT_DATE AND CURRENT_DATE + h.horizonte_dias
           ))::bigint AS com_restock,
           ROUND(AVG(alert.score_composto), 1) AS score_medio,
           COALESCE(SUM(alert.gap_unidades), 0)::bigint AS gap_total_un
    FROM alert
    WHERE alert.cobertura_dias <= h.horizonte_dias
  ) c
  ORDER BY h.horizonte_dias;
$$

ALTER FUNCTION public.fn_ruptura_forecast_7_15_30() OWNER TO postgres

REVOKE ALL ON FUNCTION public.fn_ruptura_forecast_7_15_30() FROM PUBLIC, anon

GRANT EXECUTE ON FUNCTION public.fn_ruptura_forecast_7_15_30() TO authenticated, service_role

-- ── 3. fn_whatif_scenario() ───────────────────────────────────────────
-- Contrato do front (useWhatIfScenario.ts):
--   WhatIfRow { nivel_atual, nivel_simulado, variantes, descricao }[]
-- args: p_delta_units_per_sku numeric, p_nivel_filter text, p_supplier_id uuid
-- Simula por variante (pior vss = menor prioridade simulada), para não
-- contar a mesma variante em níveis diferentes quando tem 2+ vss ativos.
CREATE OR REPLACE FUNCTION public.fn_whatif_scenario(
    p_delta_units_per_sku numeric DEFAULT 100,
    p_nivel_filter        text    DEFAULT 'RUPTURA',
    p_supplier_id         uuid    DEFAULT NULL
)
RETURNS TABLE (
    nivel_atual    text,
    nivel_simulado text,
    variantes      bigint,
    descricao      text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
  WITH sim AS (
    SELECT a.variant_id,
           a.nivel_alerta,
           CASE
               WHEN (a.stock_total + p_delta_units_per_sku) <= 0 THEN 'RUPTURA'
               WHEN (((a.stock_total + p_delta_units_per_sku)::numeric / NULLIF(a.ema_diaria, 0)))
                    < a.lead_time_efetivo THEN 'CRÍTICO'
               WHEN (((a.stock_total + p_delta_units_per_sku)::numeric / NULLIF(a.ema_diaria, 0)))
                    < (a.lead_time_efetivo * 1.5) THEN 'ALERTA'
               WHEN (((a.stock_total + p_delta_units_per_sku)::numeric / NULLIF(a.ema_diaria, 0)))
                    < (a.lead_time_efetivo * 2.0) THEN 'ATENÇÃO'
               ELSE 'OK'
           END AS nivel_simulado,
           CASE
               WHEN (a.stock_total + p_delta_units_per_sku) <= 0 THEN 1
               WHEN (((a.stock_total + p_delta_units_per_sku)::numeric / NULLIF(a.ema_diaria, 0)))
                    < a.lead_time_efetivo THEN 2
               WHEN (((a.stock_total + p_delta_units_per_sku)::numeric / NULLIF(a.ema_diaria, 0)))
                    < (a.lead_time_efetivo * 1.5) THEN 3
               WHEN (((a.stock_total + p_delta_units_per_sku)::numeric / NULLIF(a.ema_diaria, 0)))
                    < (a.lead_time_efetivo * 2.0) THEN 4
               ELSE 5
           END AS prioridade_sim
    FROM public.mv_stock_rupture_alert a
    WHERE (p_nivel_filter IS NULL OR p_nivel_filter = '' OR a.nivel_alerta = p_nivel_filter)
      AND (p_supplier_id IS NULL OR a.supplier_id = p_supplier_id)
  ),
  pior AS (
    SELECT sim.variant_id, MIN(sim.prioridade_sim) AS pmin
    FROM sim
    GROUP BY sim.variant_id
  )
  SELECT s.nivel_alerta AS nivel_atual,
         s.nivel_simulado,
         COUNT(DISTINCT s.variant_id)::bigint AS variantes,
         CASE s.nivel_simulado
             WHEN 'RUPTURA' THEN 'Sem estoque mesmo após a reposição simulada'
             WHEN 'CRÍTICO' THEN 'Cobertura simulada ainda abaixo do lead time'
             WHEN 'ALERTA'  THEN 'Cobertura simulada entre 1x e 1,5x do lead time'
             WHEN 'ATENÇÃO' THEN 'Cobertura simulada entre 1,5x e 2x do lead time'
             ELSE 'Cobertura simulada acima de 2x do lead time'
         END AS descricao
  FROM sim s
  JOIN pior p ON p.variant_id = s.variant_id AND p.pmin = s.prioridade_sim
  GROUP BY s.nivel_alerta, s.nivel_simulado
  ORDER BY MIN(s.prioridade_sim);
$$

ALTER FUNCTION public.fn_whatif_scenario(numeric, text, uuid) OWNER TO postgres

REVOKE ALL ON FUNCTION public.fn_whatif_scenario(numeric, text, uuid) FROM PUBLIC, anon

GRANT EXECUTE ON FUNCTION public.fn_whatif_scenario(numeric, text, uuid) TO authenticated, service_role

-- Confirmar reload do schema (PostgREST cacheia grants)
NOTIFY pgrst, 'reload schema'
