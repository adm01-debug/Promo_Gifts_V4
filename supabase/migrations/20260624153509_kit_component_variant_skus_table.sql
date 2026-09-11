-- ============================================================
-- Materialização: 1 linha por (componente × variante de kit)
-- component_sku = SKU_variante-slot  (ex.: 18891A-PRE-K1)
-- Destrava asset por componente/cor (primary_image_url)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.kit_component_variant_skus (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id          uuid NOT NULL REFERENCES public.product_kit_components(id) ON DELETE CASCADE,
  variant_id           uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  kit_product_id       uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  component_sku        varchar(40) NOT NULL,
  slot_code            varchar(6)  NOT NULL,
  is_packaging         boolean     NOT NULL DEFAULT false,
  variant_color_code   varchar(50),
  variant_color_name   varchar(100),
  component_name       varchar(255),
  item_color_id        uuid REFERENCES public.color_variations(id),
  primary_image_url    text,
  image_source         varchar(30),
  is_standalone_sellable boolean   NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_kcvs_sku          UNIQUE (component_sku),
  CONSTRAINT uq_kcvs_comp_variant UNIQUE (component_id, variant_id),
  CONSTRAINT chk_kcvs_slot_fmt    CHECK (slot_code ~ '^(K|E)[0-9]{1,3}$')
);

COMMENT ON TABLE public.kit_component_variant_skus IS
  'Identidade materializada de cada componente POR VARIANTE de kit. component_sku = SKU_variante-slot (ex.: 18891A-PRE-K1). '
  'Destrava asset por componente/cor (primary_image_url). Sincronizar com fn_refresh_kit_component_variant_skus().';

CREATE INDEX IF NOT EXISTS idx_kcvs_component ON public.kit_component_variant_skus(component_id);
CREATE INDEX IF NOT EXISTS idx_kcvs_variant   ON public.kit_component_variant_skus(variant_id);
CREATE INDEX IF NOT EXISTS idx_kcvs_kit       ON public.kit_component_variant_skus(kit_product_id);

-- Guarda anti-vendável também aqui
CREATE OR REPLACE FUNCTION public.fn_kcvs_guard_not_sellable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
BEGIN
  IF EXISTS (SELECT 1 FROM products p WHERE p.sku = NEW.component_sku OR p.sku_promo = NEW.component_sku) THEN
    RAISE EXCEPTION 'component_sku % colide com SKU vendável em products', NEW.component_sku;
  END IF;
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS trg_kcvs_guard ON public.kit_component_variant_skus;
CREATE TRIGGER trg_kcvs_guard
  BEFORE INSERT OR UPDATE OF component_sku
  ON public.kit_component_variant_skus
  FOR EACH ROW EXECUTE FUNCTION public.fn_kcvs_guard_not_sellable();

-- Sincronização idempotente (insere o que falta a partir da view)
CREATE OR REPLACE FUNCTION public.fn_refresh_kit_component_variant_skus()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE v_ins integer;
BEGIN
  INSERT INTO public.kit_component_variant_skus
    (component_id, variant_id, kit_product_id, component_sku, slot_code, is_packaging,
     variant_color_code, variant_color_name, component_name, item_color_id)
  SELECT s.component_id, s.variant_id, s.kit_product_id, s.component_sku, s.slot_code, s.is_packaging,
         s.variant_color_code, s.variant_color_name, s.component_name, s.item_color_id
  FROM public.v_kit_component_skus s
  ON CONFLICT (component_id, variant_id) DO NOTHING;
  GET DIAGNOSTICS v_ins = ROW_COUNT;
  RETURN v_ins;
END;
$fn$;;
