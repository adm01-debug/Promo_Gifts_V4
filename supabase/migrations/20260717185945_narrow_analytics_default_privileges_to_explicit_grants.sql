-- Corrige a blindagem de 20260717181201 apos review (codex P1).
--
-- O ALTER DEFAULT PRIVILEGES ... GRANT SELECT ON TABLES TO authenticated era
-- amplo demais: concedia SELECT direto em QUALQUER tabela/view futura de
-- analytics, nao apenas nas matviews que alimentam wrappers de public. Isso
-- contraria a Phase 5 da migration 063 ("analytics ... revoke direct access
-- from all relations"), que fechou o schema deliberadamente.
--
-- Grants explicitos por objeto (ja aplicados) continuam valendo. A protecao
-- contra recorrencia passa a ser um gate de CI, nao um privilegio amplo.
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics
  REVOKE SELECT ON TABLES FROM authenticated, service_role;

-- O REVOKE para anon permanece: e restritivo e alinhado a Phase 1 da 063.
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics
  REVOKE ALL ON TABLES FROM anon;

NOTIFY pgrst, 'reload schema';;
