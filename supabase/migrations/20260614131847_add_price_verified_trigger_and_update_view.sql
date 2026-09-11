
-- FIX #19C: Trigger para atualizar price_last_verified_at quando last_sync_at muda
CREATE OR REPLACE FUNCTION public.fn_trigger_update_price_last_verified()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Quando last_sync_at é atualizado, registrar verificação de preço
  IF NEW.last_sync_at IS DISTINCT FROM OLD.last_sync_at
     AND NEW.last_sync_at IS NOT NULL THEN
    NEW.price_last_verified_at := GREATEST(
      COALESCE(NEW.price_last_verified_at, '2000-01-01'::timestamptz),
      NEW.last_sync_at
    );
  END IF;
  -- Quando price_updated_at muda (preço realmente mudou), também atualiza verified
  IF NEW.price_updated_at IS DISTINCT FROM OLD.price_updated_at
     AND NEW.price_updated_at IS NOT NULL THEN
    NEW.price_last_verified_at := GREATEST(
      COALESCE(NEW.price_last_verified_at, '2000-01-01'::timestamptz),
      NEW.price_updated_at
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_price_last_verified ON public.products;
CREATE TRIGGER trg_update_price_last_verified
  BEFORE UPDATE OF last_sync_at, price_updated_at
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trigger_update_price_last_verified();

COMMENT ON FUNCTION public.fn_trigger_update_price_last_verified IS
'Mantém price_last_verified_at em sync com last_sync_at e price_updated_at. Dispara em BEFORE UPDATE OF last_sync_at, price_updated_at.';
;
