-- Rollback: supabase/rollbacks/20261111190000_rollback.sql
-- SB-0003 endurecido: fn_get_rupture_alerts() com search_path `public, pg_catalog, pg_temp`
-- (E066). CREATE OR REPLACE completo — e não ALTER FUNCTION — porque a função ainda NÃO
-- existe em produção (a 20261101150000 nunca foi aplicada); funciona antes ou depois dela.
-- Mesmo corpo, guarda de papel e ACL da 20261101150000 (só authenticated; anon/PUBLIC não).
-- Consumidor: src/hooks/stock/useRuptureAlerts.ts (.rpc('fn_get_rupture_alerts')).
CREATE OR REPLACE FUNCTION public.fn_get_rupture_alerts()
RETURNS SETOF public.mv_stock_rupture_alert
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
  SELECT * FROM public.mv_stock_rupture_alert
  WHERE public.is_supervisor_or_above((SELECT auth.uid()))
$$;

REVOKE ALL ON FUNCTION public.fn_get_rupture_alerts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_get_rupture_alerts() TO authenticated;
