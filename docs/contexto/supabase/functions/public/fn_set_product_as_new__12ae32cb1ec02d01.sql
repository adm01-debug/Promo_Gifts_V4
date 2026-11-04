CREATE OR REPLACE FUNCTION public.fn_set_product_as_new()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$
