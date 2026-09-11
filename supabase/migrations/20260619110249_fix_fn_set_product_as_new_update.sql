-- Fix: fn_set_product_as_new — adiciona tratamento de UPDATE para is_new false→true
CREATE OR REPLACE FUNCTION fn_set_product_as_new()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_new IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.novelty_detected_at IS NULL THEN
      NEW.novelty_detected_at := NOW();
    END IF;
    IF NEW.novelty_expires_at IS NULL THEN
      NEW.novelty_expires_at := NEW.novelty_detected_at + INTERVAL '30 days';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    DECLARE
      was_new BOOLEAN := COALESCE(OLD.is_new, FALSE);
      already_active BOOLEAN := (
        NEW.novelty_expires_at IS NOT NULL AND
        NEW.novelty_expires_at > NOW()
      );
    BEGIN
      IF (was_new = FALSE OR NOT already_active) THEN
        NEW.novelty_detected_at := NOW();
        NEW.novelty_expires_at  := NOW() + INTERVAL '30 days';
      END IF;
      RETURN NEW;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_product_as_new ON products;

CREATE TRIGGER trg_set_product_as_new
  BEFORE INSERT OR UPDATE OF is_new
  ON products
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_product_as_new();

COMMENT ON FUNCTION fn_set_product_as_new() IS
  'Preenche novelty_detected_at e novelty_expires_at quando is_new=true é definido/reativado. '
  'Dispara em INSERT e UPDATE(is_new). '
  'Idempotente: preserva expiração futura existente.';;
