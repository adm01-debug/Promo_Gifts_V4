-- ═══════════════════════════════════════════════════════════════════
-- R3c · Satélite product_supply (1:1 com products)
-- fix_version: satellite_supply_20260627
-- Extrai 7 colunas de Supply/Sync de products para tabela dedicada.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.product_supply (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id          uuid        NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  supply_mode         varchar(50),
  lead_time_days      integer,
  is_imported         boolean     DEFAULT false,
  origin_country      varchar(10),
  last_sync_at        timestamptz,
  sync_status         varchar(20),
  supplier_updated_at timestamptz,
  created_at          timestamptz DEFAULT now() NOT NULL,
  updated_at          timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.product_supply IS
'[fix_version:satellite_supply_20260627] Satélite 1:1 de dados de fornecimento/sincronização.
 Colunas: supply_mode, lead_time_days, is_imported, origin_country,
 last_sync_at, sync_status, supplier_updated_at.
 Sincronizado por trg_sync_product_supply.';

CREATE INDEX IF NOT EXISTS idx_product_supply_sync_status
  ON public.product_supply(sync_status);
CREATE INDEX IF NOT EXISTS idx_product_supply_last_sync
  ON public.product_supply(last_sync_at DESC NULLS LAST);

ALTER TABLE public.product_supply ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_supply_anon_select ON public.product_supply;
CREATE POLICY product_supply_anon_select ON public.product_supply
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS product_supply_service_all ON public.product_supply;
CREATE POLICY product_supply_service_all ON public.product_supply
  TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.fn_sync_product_supply_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
-- fix_version: satellite_supply_20260627
-- anti-regression: manter SECURITY DEFINER + search_path.
BEGIN
  INSERT INTO public.product_supply (
    product_id, supply_mode, lead_time_days, is_imported,
    origin_country, last_sync_at, sync_status, supplier_updated_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.supply_mode, NEW.lead_time_days, COALESCE(NEW.is_imported,false),
    NEW.origin_country, NEW.last_sync_at, NEW.sync_status,
    NEW.supplier_updated_at, now()
  )
  ON CONFLICT (product_id) DO UPDATE SET
    supply_mode         = EXCLUDED.supply_mode,
    lead_time_days      = EXCLUDED.lead_time_days,
    is_imported         = EXCLUDED.is_imported,
    origin_country      = EXCLUDED.origin_country,
    last_sync_at        = EXCLUDED.last_sync_at,
    sync_status         = EXCLUDED.sync_status,
    supplier_updated_at = EXCLUDED.supplier_updated_at,
    updated_at          = now();
  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.fn_sync_product_supply_on_change() IS
'[fix_version:satellite_supply_20260627] Trigger: UPSERT em product_supply. Não remover.';

DROP TRIGGER IF EXISTS trg_sync_product_supply ON public.products;
CREATE TRIGGER trg_sync_product_supply
  AFTER INSERT OR UPDATE OF
    supply_mode, lead_time_days, is_imported, origin_country,
    last_sync_at, sync_status, supplier_updated_at
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_product_supply_on_change();

-- Backfill
INSERT INTO public.product_supply (
  product_id, supply_mode, lead_time_days, is_imported,
  origin_country, last_sync_at, sync_status, supplier_updated_at
)
SELECT
  id, supply_mode, lead_time_days, COALESCE(is_imported,false),
  origin_country, last_sync_at, sync_status, supplier_updated_at
FROM products
WHERE supply_mode IS NOT NULL
   OR lead_time_days IS NOT NULL
   OR last_sync_at IS NOT NULL
   OR sync_status IS NOT NULL
ON CONFLICT (product_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';;
