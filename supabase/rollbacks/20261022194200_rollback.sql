-- Rollback de 20261022194200_security_revoke_mcp_kv_get_authenticated.sql
-- Restaura EXECUTE de authenticated em mcp_kv_get ao estado anterior.
--
-- ATENÇÃO: executar este rollback restaura uma brecha de segurança conhecida.
-- Só executar se a migration causar regressão funcional confirmada.

SET search_path = pg_catalog, public, pg_temp;

GRANT EXECUTE
  ON FUNCTION public.mcp_kv_get
  TO authenticated;
  TO authenticated;
