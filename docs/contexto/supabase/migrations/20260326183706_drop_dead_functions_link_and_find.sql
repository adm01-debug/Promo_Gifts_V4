-- ============================================================================
-- LIMPEZA: Remover funções mortas que referenciam objetos inexistentes
-- Data: 2026-03-26
-- 
-- fn_link_price_tables_to_print_areas → referencia product_print_areas (não existe)
-- fn_find_fornecedor_price_table → referencia v_fornecedor_prices_mapped (não existe)
-- Ambas SEM triggers, SEM dependentes. Código legado.
-- ============================================================================

DROP FUNCTION IF EXISTS fn_link_price_tables_to_print_areas(BOOLEAN, INTEGER);
DROP FUNCTION IF EXISTS fn_find_fornecedor_price_table(UUID, NUMERIC, NUMERIC, INTEGER);
