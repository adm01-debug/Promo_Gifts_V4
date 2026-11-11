-- Rollback: supabase/rollbacks/20261111190000_rollback.sql
-- Endurece o search_path da SECURITY DEFINER public.fn_get_rupture_alerts() (SB-0003):
-- `public` sozinho permite sombrear objetos de pg_catalog; padrão do projeto é
-- `public, pg_catalog, pg_temp`. Antes a #3179 editava a migration histórica
-- 20261101150000 (proibido pela E75); esta migration nova produz o mesmo estado final.
ALTER FUNCTION public.fn_get_rupture_alerts() SET search_path = public, pg_catalog, pg_temp;
