CREATE OR REPLACE FUNCTION public.fn_trigger_update_price_last_verified()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- CASO A: last_sync_at atualizado → confirma preço verificado
  IF NEW.last_sync_at IS DISTINCT FROM OLD.last_sync_at
     AND NEW.last_sync_at IS NOT NULL THEN
    NEW.price_last_verified_at := GREATEST(
      COALESCE(NEW.price_last_verified_at, '2000-01-01'::timestamptz),
      NEW.last_sync_at
    );
  END IF;

  -- CASO B: price_updated_at explicitamente mudado (pipeline promoção)
  IF NEW.price_updated_at IS DISTINCT FROM OLD.price_updated_at
     AND NEW.price_updated_at IS NOT NULL THEN
    NEW.price_last_verified_at := GREATEST(
      COALESCE(NEW.price_last_verified_at, '2000-01-01'::timestamptz),
      NEW.price_updated_at
    );
  END IF;

  -- CASO C (NOVO): anti-drift — se price_updated_at > price_last_verified_at
  -- mesmo sem ter mudado neste UPDATE, corrige na hora.
  -- Cobre o caso do Lovable bot que seta price_updated_at via outro caminho.
  -- fix_version: price_verified_harden_trigger_20260627
  IF NEW.price_updated_at IS NOT NULL
     AND NEW.price_last_verified_at IS NOT NULL
     AND NEW.price_updated_at > NEW.price_last_verified_at THEN
    NEW.price_last_verified_at := NEW.price_updated_at;
  END IF;

  RETURN NEW;
END;
$function$
