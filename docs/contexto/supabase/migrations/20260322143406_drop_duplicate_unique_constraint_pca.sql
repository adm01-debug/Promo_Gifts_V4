-- =================================================================
-- GAP 3 FIX: Remover UNIQUE constraint duplicada em pca
-- product_category_assignments_product_id_category_id_key (MANTER)
-- uq_product_category_assignment (REMOVER — idêntica, overhead)
-- Criado em: 2026-03-22
-- =================================================================

ALTER TABLE product_category_assignments
DROP CONSTRAINT IF EXISTS uq_product_category_assignment;
