-- ============================================================
-- FIX: price_last_verified_at drift em 65 produtos ativos
-- fix_version: price_verified_drift_harden_20260627
-- ANTI-REGRESSÃO: NÃO REMOVER o cron guard abaixo.
-- ============================================================

-- PASSO 1: Corrigir os 65 produtos com drift atual
UPDATE products
SET price_last_verified_at = GREATEST(
      COALESCE(price_last_verified_at, '2000-01-01'::timestamptz),
      COALESCE(price_updated_at,       '2000-01-01'::timestamptz),
      COALESCE(last_sync_at,           '2000-01-01'::timestamptz)
    )
WHERE price_last_verified_at < price_updated_at
  AND is_active = TRUE;

-- PASSO 2: Hardening do trigger — adiciona CASO C anti-drift
-- fix_version: price_verified_harden_trigger_20260627
CREATE OR REPLACE FUNCTION public.fn_trigger_update_price_last_verified()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
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
$$;

-- PASSO 3: Cron de guarda diária — detecta e corrige drift residual às 03:15 UTC
-- ANTI-REGRESSÃO: não remover — guarda contra regressões do Lovable bot.
DO $$
BEGIN
  PERFORM cron.unschedule('fix_price_verified_drift_daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'fix_price_verified_drift_daily',
  '15 3 * * *',
  $cron$
  UPDATE public.products
  SET price_last_verified_at = GREATEST(
        COALESCE(price_last_verified_at, '2000-01-01'::timestamptz),
        COALESCE(price_updated_at,       '2000-01-01'::timestamptz),
        COALESCE(last_sync_at,           '2000-01-01'::timestamptz)
      )
  WHERE price_last_verified_at < price_updated_at
    AND is_active = TRUE;
  $cron$
);;
