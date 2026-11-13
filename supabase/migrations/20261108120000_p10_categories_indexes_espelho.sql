-- Migration: 20261108120000_p10_categories_indexes_espelho.sql
-- Registra no banco (via migration) os 3 índices criados diretamente em produção
-- sem passar pelo workflow db-apply-migration.yml (P-10 do PENDENCIAS.md).
-- Todos os comandos são IF NOT EXISTS — no-op em produção; criam em shadow DB.
-- Rollback: supabase/rollbacks/20261108120000_rollback.sql

CREATE INDEX IF NOT EXISTS idx_categories_level
    ON public.categories USING btree (level);

CREATE INDEX IF NOT EXISTS idx_categories_level_display_order
    ON public.categories USING btree (level, display_order)
    WHERE ((is_active = true) AND (deleted_at IS NULL));

CREATE INDEX IF NOT EXISTS idx_cat_parent_nav
    ON public.categories USING btree (parent_id, display_order)
    INCLUDE (id, name, slug, level, is_active, is_visible, icon, children_count)
    WHERE (is_active = true);
