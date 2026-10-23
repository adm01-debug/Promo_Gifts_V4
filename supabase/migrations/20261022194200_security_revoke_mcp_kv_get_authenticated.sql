-- E18 (complemento) — Revogar EXECUTE de `authenticated` em `mcp_kv_get`
--
-- Contexto: A migration E18 (20260917060000) revogou o acesso de `anon`
--   à função `mcp_kv_get`. Porém, `authenticated` ainda possui EXECUTE.
--
-- Brecha confirmada em auditoria de 22/10/2026:
--   ACL atual: postgres=X/postgres, authenticated=X/postgres, service_role=X/postgres
--   Qualquer usuário logado pode chamar mcp_kv_get e acessar dados de
--   configuração interna do MCP — informações que não devem ser expostas
--   a usuários comuns da aplicação.
--
-- Causa: E18 corrigiu apenas `anon`, esqueceu `authenticated`.
-- Correção: REVOKE EXECUTE de `authenticated`. Apenas `service_role` e
--   `postgres` devem executar esta função.
--
-- Rollback: supabase/rollbacks/20261022194200_rollback.sql
-- Aprovado por: PO adm01-debug — autorizado em chat 2026-10-22 (brechas de segurança)

SET search_path = pg_catalog, public, pg_temp;

-- Completar o REVOKE que E18 deixou incompleto
REVOKE EXECUTE
  ON FUNCTION public.mcp_kv_get
  FROM authenticated;

-- Verificação pós-execução (comentário de auditoria):
-- SELECT p.proname, array_to_string(p.proacl, ', ') AS acl
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.proname = 'mcp_kv_get';
-- Esperado: somente postgres=X/postgres, service_role=X/postgres