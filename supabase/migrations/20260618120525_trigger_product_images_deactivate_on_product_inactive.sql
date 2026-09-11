
-- Trigger para auto-desativar imagens quando produto é desativado
-- Resolve T095 estruturalmente (não apenas one-shot)
CREATE OR REPLACE FUNCTION fn_sync_product_images_on_product_deactivate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Quando produto passa de ativo para inativo: desativar todas as suas imagens
  IF OLD.is_active = true AND NEW.is_active = false THEN
    UPDATE product_images
    SET is_active  = false,
        updated_at = NOW()
    WHERE product_id = NEW.id
      AND is_active  = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_images_on_product_deactivate ON products;
CREATE TRIGGER trg_sync_product_images_on_product_deactivate
  AFTER UPDATE OF is_active ON products
  FOR EACH ROW
  WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active)
  EXECUTE FUNCTION fn_sync_product_images_on_product_deactivate();

COMMENT ON TRIGGER trg_sync_product_images_on_product_deactivate ON products
  IS 'Auto-desativa imagens quando produto é desativado. Resolve T095 estruturalmente.';
;
