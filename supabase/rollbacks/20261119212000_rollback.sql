-- =====================================================================
-- ROLLBACK: fix F12 — fn_variant_sparkline + re-grant fn_ema_kpi_by_level
-- 2026-11-19
-- =====================================================================
DROP FUNCTION IF EXISTS public.fn_variant_sparkline(uuid, integer);

-- Restaura o estado pré-fix: authenticated SEM EXECUTE (retorna ao estado
-- revogado 20260716000029). Executar apenas se a reversão for realmente
-- desejada — isso re-quebra o painel KPI EMA no /estoque.
REVOKE EXECUTE ON FUNCTION public.fn_ema_kpi_by_level(boolean) FROM authenticated;
