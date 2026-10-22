-- Rollback de 20261022194100_security_revoke_mockup_approval_links_anon.sql
-- Restaura os privilégios de anon em mockup_approval_links ao estado anterior.
--
-- ATENÇÃO: executar este rollback restaura uma brecha de segurança conhecida.
-- Só executar se a migration causar regressão funcional confirmada.

SET search_path = pg_catalog, public, pg_temp;

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER
  ON public.mockup_approval_links
  TO anon;
