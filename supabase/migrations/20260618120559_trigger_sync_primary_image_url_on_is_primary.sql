
-- Resolver T086 estruturalmente: quando is_primary muda em product_images,
-- sincronizar products.primary_image_url automaticamente
CREATE OR REPLACE FUNCTION fn_sync_primary_image_url()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Caso 1: imagem passou a is_primary=true → setar no produto
  IF NEW.is_primary = true AND NEW.is_active = true THEN
    UPDATE products
    SET primary_image_url = NEW.url_cdn,
        updated_at        = NOW()
    WHERE id = NEW.product_id
      AND is_active = true
      AND (primary_image_url IS NULL OR primary_image_url != NEW.url_cdn);
  END IF;

  -- Caso 2: imagem era primary e foi desativada → limpar se não há outra primary
  IF (OLD.is_primary = true OR OLD.is_active = true)
    AND (NEW.is_primary = false OR NEW.is_active = false) THEN
    -- Verifica se ainda existe outra primary ativa
    IF NOT EXISTS (
      SELECT 1 FROM product_images
      WHERE product_id = NEW.product_id
        AND is_primary  = true
        AND is_active   = true
        AND id         != NEW.id
    ) THEN
      UPDATE products
      SET primary_image_url = (
            SELECT url_cdn FROM product_images
            WHERE product_id = NEW.product_id AND is_active = true
            ORDER BY is_primary DESC, display_order ASC, id ASC
            LIMIT 1
          ),
          updated_at = NOW()
      WHERE id = NEW.product_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_primary_image_url ON product_images;
CREATE TRIGGER trg_sync_primary_image_url
  AFTER INSERT OR UPDATE OF is_primary, is_active, url_cdn ON product_images
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_primary_image_url();

COMMENT ON TRIGGER trg_sync_primary_image_url ON product_images
  IS 'Mantém products.primary_image_url sincronizado automaticamente. Resolve T086 estruturalmente.';
;
