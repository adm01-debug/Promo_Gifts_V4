-- E40 — Revogar acesso total de `anon` em `mockup_approval_links`
--
-- Brecha confirmada em auditoria de 22/10/2026:
--   role `anon` possui DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE
--   na tabela `mockup_approval_links`. Qualquer visitante não autenticado pode
--   ler todos os links de aprovação de mockup e realizar escrita/exclusão destrutiva.
--
-- Links de aprovação de mockup são URLs com token e devem ser acessíveis apenas
-- via token válido (leitura controlada por RLS), nunca expostos em bulk a anon.
-- A tabela já tem RLS habilitado — remover os GRANTs de anon força o acesso
-- a passar pelas policies (que devem usar o token da URL como critério).
--
-- Causa: GRANT excessivo aplicado em criação da tabela.
-- Correção: REVOKE ALL de `anon`. A policy de RLS existente controla o acesso
--   por token — não é necessário nenhum GRANT direto para anon.
--
-- Rollback: supabase/rollbacks/20261022194100_rollback.sql
-- Aprovado por: PO adm01-debug — autorizado em chat 2026-10-22 (brechas de segurança)

SET search_path = pg_catalog, public, pg_temp;

-- Revogar todos os privilégios de anon em mockup_approval_links
REVOKE ALL PRIVILEGES
  ON public.mockup_approval_links
  FROM anon;

-- Verificação pós-execução (comentário de auditoria):
-- SELECT grantee, privilege_type FROM information_schema.table_privileges
-- WHERE table_name = 'mockup_approval_links' AND table_schema = 'public'
--   AND grantee IN ('anon', 'authenticated', 'public');
-- Esperado: anon sem nenhum privilege_type listado
-- Esperado: anon sem nenhum privilege_type listado
