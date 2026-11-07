-- Rollback: 20261101150000_fix_sb0003_fn_get_rupture_alerts
-- Reverte a funcao fn_get_rupture_alerts para o estado pre-migration (removida).
-- A migration original (20261013171045) fez REVOKE da mv_stock_rupture_alert;
-- ao dropar esta funcao, o acesso via RPC e removido (estado pre-SB-0003).

DROP FUNCTION IF EXISTS public.fn_get_rupture_alerts();
