-- SB-0003: restaurar acesso a mv_stock_rupture_alert via RPC com guarda de papel.
-- Causa: REVOKE em 20261013171045 retirou SELECT da view; 836 erros 42501/24h.
-- Solucao B (sem GRANT direto): SECURITY DEFINER expoe a view apenas para supervisor+.
-- Rollback: DROP FUNCTION public.fn_get_rupture_alerts();

CREATE OR REPLACE FUNCTION public.fn_get_rupture_alerts()
RETURNS SETOF public.mv_stock_rupture_alert
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.mv_stock_rupture_alert
  WHERE public.is_supervisor_or_above((SELECT auth.uid()))
$$;

REVOKE ALL ON FUNCTION public.fn_get_rupture_alerts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_get_rupture_alerts() TO authenticated;
