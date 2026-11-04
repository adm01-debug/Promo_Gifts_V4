-- =================================================================
-- REMOÇÃO: Trigger antigo que contava products_count via main_category_id
-- Motivo: Substituído por trg_pca_sync_products_count (2026-03-22)
--         que usa product_category_assignments (fonte correta).
-- =================================================================

-- 1. Remover trigger
DROP TRIGGER IF EXISTS trg_update_category_products_count ON products;

-- 2. Remover função órfã
DROP FUNCTION IF EXISTS update_category_products_count();
