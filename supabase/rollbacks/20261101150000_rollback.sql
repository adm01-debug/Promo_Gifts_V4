-- Rollback de 20261101150000_fix_sb0003_fn_get_rupture_alerts.sql.
-- Remove somente o RPC introduzido pela migration; a view materializada e a
-- função de autorização preexistentes permanecem intactas.

DROP FUNCTION IF EXISTS public.fn_get_rupture_alerts();
