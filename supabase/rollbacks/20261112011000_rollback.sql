-- Rollback: SB-0003 fn_get_rupture_alerts
-- Reverte a criação da função SECURITY DEFINER que expõe mv_stock_rupture_alert.
-- Depois deste rollback a view fica inacessível para autenticados (status pré-SB-0003).

DROP FUNCTION IF EXISTS public.fn_get_rupture_alerts();
