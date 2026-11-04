CREATE OR REPLACE FUNCTION public.validate_status_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'quotes' THEN
    -- NOTA Fase B (12/05/2026): valores 'approved'/'rejected'/'pending_approval'/'viewed'
    -- são mantidos por compatibilidade histórica até decisão Fase C
    -- (novo ciclo de vida do orçamento sem rotas públicas).
    IF NEW.status NOT IN ('draft', 'pending', 'sent', 'approved', 'rejected', 'expired', 'revision', 'pending_approval', 'converted', 'viewed') THEN
      RAISE EXCEPTION 'Invalid quote status: %', NEW.status;
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'orders' THEN
    IF NEW.status NOT IN ('pending', 'confirmed', 'in_production', 'shipped', 'delivered', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid order status: %', NEW.status;
    END IF;
    IF NEW.fulfillment_status NOT IN ('unfulfilled', 'partially_fulfilled', 'fulfilled') THEN
      RAISE EXCEPTION 'Invalid fulfillment status: %', NEW.fulfillment_status;
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'custom_kits' THEN
    IF NEW.status NOT IN ('draft', 'ready', 'shared', 'archived') THEN
      RAISE EXCEPTION 'Invalid kit status: %', NEW.status;
    END IF;
  END IF;
  -- ❌ REMOVIDOS (Fase B Decision 011): branches de kit_share_tokens e quote_approval_tokens
  --    Tables foram dropadas — rotas públicas com token não existem mais no modelo.
  RETURN NEW;
END;
$function$
