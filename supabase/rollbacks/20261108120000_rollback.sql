-- Rollback: 20261108120000_rollback.sql
-- Remove os índices criados pela migration P-10 (espelho de índices out-of-band).
-- ATENÇÃO: em produção estes índices já existiam antes da migration;
-- aplicar este rollback os DERRUBA de vez.

DROP INDEX IF EXISTS public.idx_categories_level;
DROP INDEX IF EXISTS public.idx_categories_level_display_order;
DROP INDEX IF EXISTS public.idx_cat_parent_nav;
