-- 1. Adicionar campo
ALTER TABLE variant_supplier_sources ADD COLUMN price_updated_at timestamptz;

-- 2. Seed com updated_at existente
UPDATE variant_supplier_sources SET price_updated_at = updated_at WHERE cost_price IS NOT NULL AND cost_price > 0;

-- 3. Criar trigger
CREATE OR REPLACE FUNCTION fn_trigger_track_price_updated_vss()
RETURNS TRIGGER AS $$
BEGIN
    IF (
        NEW.cost_price IS DISTINCT FROM OLD.cost_price OR
        NEW.list_price IS DISTINCT FROM OLD.list_price OR
        NEW.cost_price_1 IS DISTINCT FROM OLD.cost_price_1 OR
        NEW.cost_price_2 IS DISTINCT FROM OLD.cost_price_2 OR
        NEW.cost_price_3 IS DISTINCT FROM OLD.cost_price_3 OR
        NEW.cost_price_4 IS DISTINCT FROM OLD.cost_price_4 OR
        NEW.cost_price_5 IS DISTINCT FROM OLD.cost_price_5
    ) THEN
        NEW.price_updated_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_track_price_updated_vss
BEFORE UPDATE ON variant_supplier_sources
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_track_price_updated_vss();
