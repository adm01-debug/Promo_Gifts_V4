-- ============================================================
-- Travas de integridade da identidade de componente (Plano A)
-- ============================================================

-- Flag explícita: componente nunca é vendável avulso
ALTER TABLE public.product_kit_components
  ADD COLUMN IF NOT EXISTS is_standalone_sellable boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.product_kit_components.is_standalone_sellable IS
  'Sempre false: componente de kit NUNCA é vendido separadamente. Reforçado por separação de tabela + guarda anti-colisão.';

-- Unicidade do slot dentro do kit
ALTER TABLE public.product_kit_components DROP CONSTRAINT IF EXISTS uq_pkc_kit_slot;
ALTER TABLE public.product_kit_components ADD CONSTRAINT uq_pkc_kit_slot UNIQUE (kit_product_id, slot_code);

-- Unicidade global do código agnóstico (PAI-SLOT)
DROP INDEX IF EXISTS public.uq_pkc_component_code;
CREATE UNIQUE INDEX uq_pkc_component_code
  ON public.product_kit_components(component_code) WHERE component_code IS NOT NULL;

-- Coerência slot × tipo: item=K, embalagem=E
ALTER TABLE public.product_kit_components DROP CONSTRAINT IF EXISTS chk_pkc_slot_kind;
ALTER TABLE public.product_kit_components ADD CONSTRAINT chk_pkc_slot_kind CHECK (
      slot_code IS NULL
   OR (is_packaging     AND slot_code LIKE 'E%')
   OR (NOT is_packaging AND slot_code LIKE 'K%'));

-- GUARDA anti-vendável: código de componente jamais pode existir em products.sku/sku_promo
CREATE OR REPLACE FUNCTION public.fn_pkc_guard_not_sellable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
BEGIN
  IF NEW.component_code IS NOT NULL AND EXISTS (
       SELECT 1 FROM products p WHERE p.sku = NEW.component_code OR p.sku_promo = NEW.component_code) THEN
    RAISE EXCEPTION 'component_code % colide com SKU vendável em products', NEW.component_code;
  END IF;
  IF NEW.component_sku IS NOT NULL AND EXISTS (
       SELECT 1 FROM products p WHERE p.sku = NEW.component_sku OR p.sku_promo = NEW.component_sku) THEN
    RAISE EXCEPTION 'component_sku % colide com SKU vendável em products', NEW.component_sku;
  END IF;
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS trg_pkc_guard_not_sellable ON public.product_kit_components;
CREATE TRIGGER trg_pkc_guard_not_sellable
  BEFORE INSERT OR UPDATE OF component_code, component_sku
  ON public.product_kit_components
  FOR EACH ROW EXECUTE FUNCTION public.fn_pkc_guard_not_sellable();

-- IMUTABILIDADE do slot_code (congelado após 1ª atribuição → estável na re-ingestão)
CREATE OR REPLACE FUNCTION public.fn_pkc_freeze_slot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
BEGIN
  IF OLD.slot_code IS NOT NULL AND NEW.slot_code IS DISTINCT FROM OLD.slot_code THEN
    RAISE EXCEPTION 'slot_code é imutável (% -> %) no componente %', OLD.slot_code, NEW.slot_code, OLD.id;
  END IF;
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS trg_pkc_freeze_slot ON public.product_kit_components;
CREATE TRIGGER trg_pkc_freeze_slot
  BEFORE UPDATE OF slot_code
  ON public.product_kit_components
  FOR EACH ROW EXECUTE FUNCTION public.fn_pkc_freeze_slot();;
