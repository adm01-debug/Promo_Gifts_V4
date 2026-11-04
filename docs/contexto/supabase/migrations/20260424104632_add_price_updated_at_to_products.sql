-- 1. Adicionar campo
ALTER TABLE products ADD COLUMN price_updated_at timestamptz;

-- 2. Seed com updated_at existente
UPDATE products SET price_updated_at = updated_at WHERE (cost_price IS NOT NULL AND cost_price > 0) OR (sale_price IS NOT NULL AND sale_price > 0);

-- 3. Criar trigger
CREATE OR REPLACE FUNCTION fn_trigger_track_price_updated_products()
RETURNS TRIGGER AS $$
BEGIN
    IF (
        NEW.cost_price IS DISTINCT FROM OLD.cost_price OR
        NEW.sale_price IS DISTINCT FROM OLD.sale_price OR
        NEW.suggested_price IS DISTINCT FROM OLD.suggested_price
    ) THEN
        NEW.price_updated_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_track_price_updated_products
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_track_price_updated_products();
