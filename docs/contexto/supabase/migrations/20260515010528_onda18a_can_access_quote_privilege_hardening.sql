-- =================================================================
-- Onda 18a hardening (CodeRabbit nitpick): REVOKE+GRANT explicit
--
-- Alinha can_access_quote com padrao do projeto para SECURITY DEFINER:
-- (search_products_semantic, get_connection_failure_window_minutes, etc)
-- =================================================================

REVOKE ALL ON FUNCTION public.can_access_quote(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_quote(uuid) TO authenticated, service_role;
