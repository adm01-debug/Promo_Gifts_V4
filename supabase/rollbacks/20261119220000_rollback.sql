-- =====================================================================
-- ROLLBACK: funções irmãs do painel EMA (/estoque) — restauração Onda 3
-- 2026-11-19
-- =====================================================================
DROP FUNCTION IF EXISTS public.fn_ema_coverage_stats();
DROP FUNCTION IF EXISTS public.fn_ruptura_forecast_7_15_30();
DROP FUNCTION IF EXISTS public.fn_whatif_scenario(numeric, text, uuid);
