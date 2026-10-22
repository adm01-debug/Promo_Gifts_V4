-- Rollback de 20261022194000_security_revoke_external_connections_anon.sql
-- Restaura os privilégios de anon em external_connections ao estado anterior.
--
-- ATENÇÃO: executar este rollback restaura uma brecha de segurança conhecida.
-- Só executar se a migration causar regressão funcional confirmada.

SET search_path = pg_catalog, public, pg_temp;

GRANT INSERT, UPDATE, DELETE, REFERENCES, TRIGGER
  ON public.external_connections
  TO anon;
  TO anon;
