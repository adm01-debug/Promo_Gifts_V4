-- P200-E069 (2026-10-18): dropar índice redundante por prefixo.
-- idx_user_organizations_user (user_id) é coberto por prefixo de
-- idx_user_organizations_user_org_covering (user_id, organization_id).
-- Manter duas árvores B-tree para a mesma coluna custa escrita desnecessária.
--
-- Pré-condição: idx_user_organizations_user_org_covering existente e com idx_scan > 0.
-- Rollback: CREATE INDEX idx_user_organizations_user ON public.user_organizations(user_id);
--
-- transaction: none
-- approved-by: comercial@aquarellaprint.com.br (E069/P200)

DROP INDEX CONCURRENTLY IF EXISTS public.idx_user_organizations_user;
