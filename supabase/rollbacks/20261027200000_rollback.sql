-- Rollback: 20261027200000_supplier_stricker_rls_deny_all.sql
-- Remove RLS e policy deny_all das 17 tabelas de supplier_stricker.

DROP POLICY IF EXISTS deny_all ON supplier_stricker.canceled_products;
DROP POLICY IF EXISTS deny_all ON supplier_stricker.category_mappings;
DROP POLICY IF EXISTS deny_all ON supplier_stricker.colors;
DROP POLICY IF EXISTS deny_all ON supplier_stricker.stg_colors;
DROP POLICY IF EXISTS deny_all ON supplier_stricker.customization_options;
DROP POLICY IF EXISTS deny_all ON supplier_stricker.customization_tables;
DROP POLICY IF EXISTS deny_all ON supplier_stricker.stg_customizations;
DROP POLICY IF EXISTS deny_all ON supplier_stricker.stg_images;
DROP POLICY IF EXISTS deny_all ON supplier_stricker.optionals;
DROP POLICY IF EXISTS deny_all ON supplier_stricker.stg_product_types;
DROP POLICY IF EXISTS deny_all ON supplier_stricker.product_types;
DROP POLICY IF EXISTS deny_all ON supplier_stricker.products;
DROP POLICY IF EXISTS deny_all ON supplier_stricker.stg_optionals;
DROP POLICY IF EXISTS deny_all ON supplier_stricker.stg_products;
DROP POLICY IF EXISTS deny_all ON supplier_stricker.stg_stock;
DROP POLICY IF EXISTS deny_all ON supplier_stricker.stocks;
DROP POLICY IF EXISTS deny_all ON supplier_stricker.sync_log;

ALTER TABLE supplier_stricker.canceled_products     DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.category_mappings     DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.colors                DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.stg_colors              DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.customization_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.customization_tables  DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.stg_customizations     DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.stg_images              DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.optionals             DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.stg_product_types       DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.product_types         DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.products              DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.stg_optionals         DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.stg_products          DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.stg_stock             DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.stocks                DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.sync_log              DISABLE ROW LEVEL SECURITY;
