-- =====================================================================
-- Rollback: supabase/rollbacks/20261119212000_rollback.sql
-- =====================================================================
-- =====================================================================
-- MIGRATION: fix F12 — fn_variant_sparkline + re-grant fn_ema_kpi_by_level
-- 2026-11-19 — F12 (bugs de painel no /estoque)
-- =====================================================================
-- Causa raiz (evidência):
--  1. fn_variant_sparkline NUNCA foi migrada: o front RuptureSparkline.tsx:33
--     chama a RPC desde o commit 037d9a161 (criação do componente), mas a
--     função SQL não existe no banco => PGRST202 para todos os papéis
--     (reproduzido via curl com service key).
--  2. fn_ema_kpi_by_level perdeu EXECUTE para authenticated nas revogações
--     massivas 20260626184039 + 20260716000029 (Phase 5) => 403 com chave
--     anon/authenticated, 200 só com service key (reproduzido via curl).
--
-- Decisão: NÃO adicionar guarda de papel (is_supervisor_or_above).
-- O painel /estoque atende `authenticated` (vendedores incluídos); a fontes
-- e irmãs já são concedidas a authenticated:
--   - stock_daily_summary: policy auth_read_stock_daily_summary (prod linha 104641)
--     SELECT TO authenticated USING (true) + GRANT SELECT authenticated;
--   - mv_ema_kpi_by_level / mv_stock_rupture_alert: migration 20260717235313
--     GRANT SELECT TO authenticated.
-- Adicionar guarda quebraria o painel para vendedores (mudança de negócio).
-- Anti-regressão: anon continua SEM EXECUTE nas duas funções.
-- =====================================================================

-- ── 1. fn_variant_sparkline (nova) ────────────────────────────────────
-- Contrato do front (RuptureSparkline.tsx:33):
--   { p_variant_id uuid, p_days number } => { day, units_depleted, stock_close }[]
CREATE OR REPLACE FUNCTION public.fn_variant_sparkline(
    p_variant_id uuid,
    p_days integer DEFAULT 7
)
RETURNS TABLE (
    day            date,
    units_depleted integer,
    stock_close    integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
  SELECT s.summary_date::date AS day,
         s.units_depleted,
         s.stock_close
  FROM public.stock_daily_summary s
  WHERE s.variant_id = p_variant_id
    AND s.summary_date >= (CURRENT_DATE - (p_days - 1))
  ORDER BY s.summary_date ASC
  LIMIT GREATEST(p_days, 1);
$$;

ALTER FUNCTION public.fn_variant_sparkline(uuid, integer) OWNER TO postgres;

-- Explicitar anti-regressão: somente authenticated/service_role executam.
REVOKE ALL ON FUNCTION public.fn_variant_sparkline(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_variant_sparkline(uuid, integer) TO authenticated, service_role;

-- ── 2. fn_ema_kpi_by_level — restaurar EXECUTE para authenticated ─────
-- (assinatura p_preferred_only boolean DEFAULT true; SEM re-grant a anon.)
REVOKE ALL ON FUNCTION public.fn_ema_kpi_by_level(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_ema_kpi_by_level(boolean) TO authenticated, service_role;

-- Confirmar reload do schema (PostgREST cacheia grants)
NOTIFY pgrst, 'reload schema';
