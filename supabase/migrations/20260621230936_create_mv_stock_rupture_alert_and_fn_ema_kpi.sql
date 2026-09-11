
-- =====================================================================
-- MIGRATION: mv_stock_rupture_alert + fn_ema_kpi_by_level
-- 2026-06-21 — APLICADO
-- Corrige bugs B1, B2, B3, B7
-- =====================================================================

-- ── STEP 1: Drop se existir (view não existia, mas por idempotência) ──
DROP MATERIALIZED VIEW IF EXISTS public.mv_stock_rupture_alert CASCADE;

-- ── STEP 2: Criar Materialized View ──────────────────────────────────
CREATE MATERIALIZED VIEW public.mv_stock_rupture_alert AS
WITH ema_calc AS (
  /*
   * EMA diária ponderada (α≈0.3 via janelas 7/30/90d).
   * Pesos: 50% últimos 7d (sinal atual) + 35% últimos 30d (baseline)
   *        + 15% últimos 90d (tendência longa).
   * Floor em 0.01 evita divisão-por-zero na cobertura_dias.
   */
  SELECT
    sv.variant_supplier_source_id                                              AS vss_id,
    sv.variant_id,
    sv.supplier_id,
    sv.current_stock,
    sv.current_price,
    sv.velocity_trend,
    sv.active_days_30d,
    sv.days_to_stockout,
    GREATEST(
      0.01,
      CASE
        WHEN sv.avg_daily_depletion_7d  > 0 AND sv.avg_daily_depletion_30d > 0
          THEN  sv.avg_daily_depletion_7d  * 0.50
              + sv.avg_daily_depletion_30d * 0.35
              + COALESCE(sv.avg_daily_depletion_90d, sv.avg_daily_depletion_30d) * 0.15
        WHEN sv.avg_daily_depletion_30d > 0
          THEN  sv.avg_daily_depletion_30d * 0.70
              + COALESCE(sv.avg_daily_depletion_90d, sv.avg_daily_depletion_30d) * 0.30
        WHEN sv.avg_daily_depletion_90d > 0
          THEN sv.avg_daily_depletion_90d
        ELSE 0.01
      END
    )::numeric(10,4)                                                           AS ema_diaria
  FROM analytics.mv_stock_velocity sv
  JOIN variant_supplier_sources vss_chk
    ON  vss_chk.id             = sv.variant_supplier_source_id
    AND vss_chk.is_active      = TRUE
    AND (vss_chk.removed_from_api IS DISTINCT FROM TRUE)
),
computed AS (
  SELECT
    e.vss_id,
    e.variant_id,
    e.supplier_id,
    e.ema_diaria,
    e.velocity_trend,
    e.active_days_30d,
    s.name                                                                     AS supplier_name,
    vss.supplier_sku,
    COALESCE(vss.is_preferred, FALSE)                                          AS is_preferred,
    -- Estoque total = warehouse principal + outros warehouses
    (COALESCE(vss.stock_main_warehouse, 0)
     + COALESCE(vss.stock_other_warehouses, 0))                               AS stock_total,
    -- Lead time: preferência vss > supplier delivery_time > default 7d
    COALESCE(vss.lead_time_days, s.delivery_time_days, 7)                     AS lead_time_efetivo,
    -- Custo unitário: cascata de fallback
    COALESCE(vss.cost_price, vss.your_price, e.current_price, 0)              AS unit_cost,
    -- Cobertura em dias (recalculada com estoque live, não o snapshot da velocity)
    CASE
      WHEN e.ema_diaria > 0.01
        THEN ROUND(
               (COALESCE(vss.stock_main_warehouse,0) + COALESCE(vss.stock_other_warehouses,0))
               ::numeric / e.ema_diaria,
             1)
      ELSE COALESCE(e.days_to_stockout, 9999.0)
    END                                                                        AS cobertura_dias
  FROM ema_calc e
  JOIN variant_supplier_sources vss ON vss.id = e.vss_id
  JOIN suppliers                  s ON s.id   = e.supplier_id
),
classified AS (
  SELECT
    c.*,
    /*
     * nivel_alerta: valores EXATOS dos TypeScript types (RuptureLevel):
     * 'RUPTURA' | 'CRÍTICO' | 'ALERTA' | 'ATENÇÃO' | 'OK'
     * Ordem de severidade: RUPTURA > CRÍTICO > ALERTA > ATENÇÃO > OK
     */
    CASE
      WHEN c.stock_total = 0
        THEN 'RUPTURA'
      WHEN c.cobertura_dias < c.lead_time_efetivo
        THEN 'CRÍTICO'
      WHEN c.cobertura_dias < c.lead_time_efetivo * 1.5
        THEN 'ALERTA'
      WHEN c.cobertura_dias < c.lead_time_efetivo * 2.0
        THEN 'ATENÇÃO'
      ELSE 'OK'
    END                                                                        AS nivel_alerta,
    -- prioridade numérica: 1=pior (usado em pickWorse do hook)
    CASE
      WHEN c.stock_total = 0                              THEN 1
      WHEN c.cobertura_dias < c.lead_time_efetivo         THEN 2
      WHEN c.cobertura_dias < c.lead_time_efetivo * 1.5  THEN 3
      WHEN c.cobertura_dias < c.lead_time_efetivo * 2.0  THEN 4
      ELSE 5
    END                                                                        AS prioridade,
    /*
     * score_composto 0–100: urgência de compra
     * RUPTURA=100 | CRÍTICO=75-99 | ALERTA=50-74 | ATENÇÃO=25-49 | OK=0-24
     */
    LEAST(100, GREATEST(0,
      CASE
        WHEN c.stock_total = 0
          THEN 100.0
        WHEN c.cobertura_dias < c.lead_time_efetivo
          THEN 75.0 + 25.0 * GREATEST(0.0,
                1.0 - COALESCE(c.cobertura_dias, 0)
                    / NULLIF(c.lead_time_efetivo::numeric, 0))
        WHEN c.cobertura_dias < c.lead_time_efetivo * 1.5
          THEN 50.0 + 25.0 * GREATEST(0.0,
                1.0 - (COALESCE(c.cobertura_dias, 0) - c.lead_time_efetivo)
                    / NULLIF(c.lead_time_efetivo * 0.5, 0))
        WHEN c.cobertura_dias < c.lead_time_efetivo * 2.0
          THEN 25.0 + 25.0 * GREATEST(0.0,
                1.0 - (COALESCE(c.cobertura_dias, 0) - c.lead_time_efetivo * 1.5)
                    / NULLIF(c.lead_time_efetivo * 0.5, 0))
        ELSE GREATEST(0.0, 25.0 - LEAST(25.0, COALESCE(c.cobertura_dias, 9999.0) / 40.0))
      END
    ))::numeric(5,2)                                                           AS score_composto,
    /*
     * confidence_level: valores EXATOS do TypeScript (ConfidenceLevel):
     * 'ALTA' | 'MÉDIA' | 'BAIXA' | 'INSUFICIENTE'
     */
    CASE
      WHEN COALESCE(c.active_days_30d, 0) >= 20 THEN 'ALTA'
      WHEN COALESCE(c.active_days_30d, 0) >= 12 THEN 'MÉDIA'
      WHEN COALESCE(c.active_days_30d, 0) >=  5 THEN 'BAIXA'
      ELSE 'INSUFICIENTE'
    END                                                                        AS confidence_level,
    -- anomalia_spike: consumo nos últimos 7d > 1.5x a média dos 30d
    COALESCE(c.velocity_trend > 1.5, FALSE)                                   AS anomalia_spike,
    -- gap_unidades: unidades necessárias para cobrir 2× lead_time
    GREATEST(0,
      CEIL(c.lead_time_efetivo * 2.0 * c.ema_diaria - c.stock_total)
    )::integer                                                                 AS gap_unidades,
    -- valor em R$
    ROUND(c.stock_total * c.unit_cost, 2)                                     AS valor_estoque_reais
  FROM computed c
)
SELECT
  vss_id,
  variant_id,
  supplier_id,
  supplier_name,
  supplier_sku,
  is_preferred,
  ema_diaria,
  lead_time_efetivo,
  stock_total,
  cobertura_dias,
  nivel_alerta,
  prioridade,
  score_composto,
  confidence_level,
  anomalia_spike,
  gap_unidades,
  valor_estoque_reais
FROM classified
ORDER BY score_composto DESC NULLS LAST;

-- ── STEP 3: Unique index (obrigatório para REFRESH CONCURRENTLY) ──────
CREATE UNIQUE INDEX uidx_mv_stock_rupture_alert_vss_id
  ON public.mv_stock_rupture_alert (vss_id);

-- ── STEP 4: Índices de performance (B7) ──────────────────────────────
-- Filtro principal do frontend: is_preferred + order score_composto
CREATE INDEX idx_mv_stock_rupture_alert_pref_score
  ON public.mv_stock_rupture_alert (is_preferred, score_composto DESC);

-- Lookup por nivel_alerta (filtro do painel RupturePanelEma)
CREATE INDEX idx_mv_stock_rupture_alert_nivel
  ON public.mv_stock_rupture_alert (nivel_alerta);

-- Lookup por variant_id (byVariantId map no hook)
CREATE INDEX idx_mv_stock_rupture_alert_variant_id
  ON public.mv_stock_rupture_alert (variant_id);

-- Lookup por supplier_id
CREATE INDEX idx_mv_stock_rupture_alert_supplier_id
  ON public.mv_stock_rupture_alert (supplier_id);

-- ── STEP 5: fn_ema_kpi_by_level (B2) ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_ema_kpi_by_level(
  p_preferred_only boolean DEFAULT true
)
RETURNS TABLE (
  nivel_alerta    text,
  prioridade      integer,
  total_variantes bigint,
  avg_cobertura   numeric,
  min_cobertura   numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.nivel_alerta::text,
    m.prioridade::integer,
    COUNT(DISTINCT m.variant_id)               AS total_variantes,
    ROUND(AVG(m.cobertura_dias)::numeric, 1)   AS avg_cobertura,
    ROUND(MIN(m.cobertura_dias)::numeric, 1)   AS min_cobertura
  FROM public.mv_stock_rupture_alert m
  WHERE (NOT p_preferred_only OR m.is_preferred = true)
  GROUP BY m.nivel_alerta, m.prioridade
  ORDER BY m.prioridade;
$$;

-- ── STEP 6: Grants PostgREST (anon + authenticated) ──────────────────
GRANT SELECT ON public.mv_stock_rupture_alert
  TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.fn_ema_kpi_by_level(boolean)
  TO anon, authenticated, service_role;

-- ── STEP 7: Invalidar cache PostgREST ────────────────────────────────
NOTIFY pgrst, 'reload schema';
;
