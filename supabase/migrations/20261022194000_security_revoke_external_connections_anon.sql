-- E30 — Revogar acesso de escrita de `anon` em `external_connections`
--
-- Brecha confirmada em auditoria de 22/10/2026:
--   role `anon` (não autenticada) possui DELETE, INSERT, REFERENCES, TRIGGER, UPDATE
--   na tabela `external_connections`. Qualquer visitante anônimo pode gravar,
--   alterar e deletar conexões externas — risco crítico de integridade de dados.
--
-- Causa: GRANT excessivo aplicado em criação da tabela (sem política de mínimo privilégio).
-- Correção: REVOKE de todos os privilégios de escrita de `anon`.
--   SELECT não é revogado — se havia motivo para leitura anônima, preserva-se.
--   Se SELECT também for excessivo, uma migration posterior pode revogá-lo.
--
-- Rollback: supabase/rollbacks/20261022194000_rollback.sql
-- Aprovado por: PO adm01-debug — autorizado em chat 2026-10-22 (brechas de segurança)

SET search_path = pg_catalog, public, pg_temp;

-- Revogar privilégios de escrita de anon em external_connections
REVOKE INSERT, UPDATE, DELETE, REFERENCES, TRIGGER
  ON public.external_connections
  FROM anon;

-- Verificação pós-execução (comentário de auditoria):
-- SELECT grantee, privilege_type FROM information_schema.table_privileges
-- WHERE table_name = 'external_connections' AND table_schema = 'public'
--   AND grantee IN ('anon', 'authenticated', 'public');
-- Esperado: anon sem INSERT/UPDATE/DELETE/REFERENCES/TRIGGER
