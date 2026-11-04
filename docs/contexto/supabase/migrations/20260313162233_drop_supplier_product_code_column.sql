-- 1. Dropar o índice
DROP INDEX IF EXISTS idx_products_supplier_code;

-- 2. Dropar a coluna
ALTER TABLE products DROP COLUMN IF EXISTS supplier_product_code;
