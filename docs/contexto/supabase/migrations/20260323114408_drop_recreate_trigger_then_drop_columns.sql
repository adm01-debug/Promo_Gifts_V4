-- ============================================================
-- ONDA 1B: Drop trigger → Drop columns → Recreate trigger
-- ============================================================

-- 1. Drop o trigger (libera a dependência)
DROP TRIGGER IF EXISTS trg_set_product_defaults ON products;

-- 2. Drop as colunas agora livres
ALTER TABLE products
  DROP COLUMN IF EXISTS image_url,
  DROP COLUMN IF EXISTS country_of_origin,
  DROP COLUMN IF EXISTS min_stock,
  DROP COLUMN IF EXISTS minimum_stock,
  DROP COLUMN IF EXISTS stock_unit;

-- 3. Recriar o trigger (agora a function já não usa country_of_origin)
CREATE TRIGGER trg_set_product_defaults
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION set_product_defaults_from_supplier();
