
-- =====================================================================
-- FIX: cobertura_dias deve ser 0 quando stock_total = 0 (não 9999)
-- 2026-06-21 — APLICADO
-- =====================================================================

DROP MATERIALIZED VIEW IF EXISTS public.mv_stock_rupture_alert CASCADE;

CREATE MATERIALIZED VIEW public.mv_stock_rupture_alert AS
WITH ema_calc AS (
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
    (COALESCE(vss.stock_main_warehouse,  0)
     + COALESCE(vss.stock_other_warehouses, 0))                               AS stock_total,
    COALESCE(vss.lead_time_days, s.delivery_time_days, 7)                     AS lead_time_efetivo,
    COALESCE(vss.cost_price, vss.your_price, e.current_price, 0)              AS unit_cost,
    -- BUG FIX: stock = 0 → cobertura = 0 (não 9999 nem days_to_stockout)
    CASE
      WHEN (COALESCE(vss.stock_main_warehouse, 0) + COALESCE(vss.stock_other_warehouses, 0)) = 0
        THEN 0.0
      WHEN e.ema_diaria > 0.01
        THEN ROUND(
               (COALESCE(vss.stock_main_warehouse, 0) + COALESCE(vss.stock_other_warehouses, 0))
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
    CASE
      WHEN c.stock_total = 0                              THEN 'RUPTURA'
      WHEN c.cobertura_dias < c.lead_time_efetivo         THEN 'CRÍTICO'
      WHEN c.cobertura_dias < c.lead_time_efetivo * 1.5  THEN 'ALERTA'
      WHEN c.cobertura_dias < c.lead_time_efetivo * 2.0  THEN 'ATENÇÃO'
      ELSE 'OK'
    END                                                                        AS nivel_alerta,
    CASE
      WHEN c.stock_total = 0                              THEN 1
      WHEN c.cobertura_dias < c.lead_time_efetivo         THEN 2
      WHEN c.cobertura_dias < c.lead_time_efetivo * 1.5  THEN 3
      WHEN c.cobertura_dias < c.lead_time_efetivo * 2.0  THEN 4
      ELSE 5
    END                                                                        AS prioridade,
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
    CASE
      WHEN COALESCE(c.active_days_30d, 0) >= 20 THEN 'ALTA'
      WHEN COALESCE(c.active_days_30d, 0) >= 12 THEN 'MÉDIA'
      WHEN COALESCE(c.active_days_30d, 0) >=  5 THEN 'BAIXA'
      ELSE 'INSUFICIENTE'
    END                                                                        AS confidence_level,
    COALESCE(c.velocity_trend > 1.5, FALSE)                                   AS anomalia_spike,
    GREATEST(0,
      CEIL(c.lead_time_efetivo * 2.0 * c.ema_diaria - c.stock_total)
    )::integer                                                                 AS gap_unidades,
    ROUND(c.stock_total * c.unit_cost, 2)                                     AS valor_estoque_reais
  FROM computed c
)
SELECT
  vss_id, variant_id, supplier_id, supplier_name, supplier_sku,
  is_preferred, ema_diaria, lead_time_efetivo, stock_total,
  cobertura_dias, nivel_alerta, prioridade, score_composto,
  confidence_level, anomalia_spike, gap_unidades, valor_estoque_reais
FROM classified
ORDER BY score_composto DESC NULLS LAST;

-- Índices (recriados após DROP CASCADE)
CREATE UNIQUE INDEX uidx_mv_stock_rupture_alert_vss_id
  ON public.mv_stock_rupture_alert (vss_id);

CREATE INDEX idx_mv_stock_rupture_alert_pref_score
  ON public.mv_stock_rupture_alert (is_preferred, score_composto DESC);

CREATE INDEX idx_mv_stock_rupture_alert_nivel
  ON public.mv_stock_rupture_alert (nivel_alerta);

CREATE INDEX idx_mv_stock_rupture_alert_variant_id
  ON public.mv_stock_rupture_alert (variant_id);

CREATE INDEX idx_mv_stock_rupture_alert_supplier_id
  ON public.mv_stock_rupture_alert (supplier_id);

-- Recriar função (perdida com CASCADE)
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

-- Grants
GRANT SELECT ON public.mv_stock_rupture_alert
  TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.fn_ema_kpi_by_level(boolean)
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
;
