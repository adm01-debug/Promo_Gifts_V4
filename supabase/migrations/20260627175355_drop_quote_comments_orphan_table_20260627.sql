
-- fix_version: drop_quote_comments_v1
-- ANTI-REGRESSION: migration canônica que substitui a UUID do Lovable
-- (20260627154703_5bb7d91f-de10-487b-843d-23d8bbdc0486.sql).
-- O Lovable gerou um DROP diretamente em main; convertemos para migração
-- versionada, registrando no schema_migrations para evitar dupla-execução.
--
-- Pré-condições verificadas (adversarial, 2026-06-27):
--   - 0 linhas em quote_comments (sem dados a perder)
--   - 0 FKs externas apontando para esta tabela
--   - 0 views dependentes
--   - UI consumidora (QuoteComments) removida do frontend
DROP TABLE IF EXISTS public.quote_comments CASCADE;
;
