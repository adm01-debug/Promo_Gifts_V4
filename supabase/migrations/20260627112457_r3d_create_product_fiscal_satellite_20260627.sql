-- ═══════════════════════════════════════════════════════════════════
-- R3d · Satélite product_fiscal (1:1 com products)
-- fix_version: satellite_fiscal_20260627
-- Extrai dados fiscais/tributários de products para tabela dedicada.
-- Colunas ean, gtin, warranty_months não existem em products ainda —
-- criadas aqui para uso futuro do pipeline fiscal.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.product_fiscal (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id          uuid        NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  -- Colunas existentes em products (migradas)
  ncm_id              uuid        REFERENCES ncm_codes(id) ON DELETE SET NULL,
  ncm_code            varchar(10),
  ipi_rate            numeric(8,4),
  tax_reference_state varchar(5),
  -- Colunas novas (não existem em products — reservadas para pipeline fiscal)
  ean                 varchar(14),
  gtin                varchar(14),
  warranty_months     smallint,
  cst_icms            varchar(3),
  cest               varchar(7),
  created_at          timestamptz DEFAULT now() NOT NULL,
  updated_at          timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.product_fiscal IS
'[fix_version:satellite_fiscal_20260627] Satélite 1:1 de dados fiscais/tributários.
 Colunas migradas de products: ncm_id, ncm_code, ipi_rate, tax_reference_state.
 Colunas novas (pipeline futuro): ean, gtin, warranty_months, cst_icms, cest.
 Sincronizado por trg_sync_product_fiscal.';

-- Verificar se a tabela ncm_codes existe (FK opcional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='ncm_codes'
  ) THEN
    -- Remover FK para ncm_codes se tabela não existe
    ALTER TABLE public.product_fiscal DROP CONSTRAINT IF EXISTS product_fiscal_ncm_id_fkey;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_product_fiscal_ncm_code
  ON public.product_fiscal(ncm_code);
CREATE INDEX IF NOT EXISTS idx_product_fiscal_ncm_id
  ON public.product_fiscal(ncm_id) WHERE ncm_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_fiscal_ean
  ON public.product_fiscal(ean) WHERE ean IS NOT NULL;

ALTER TABLE public.product_fiscal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_fiscal_anon_select ON public.product_fiscal;
CREATE POLICY product_fiscal_anon_select ON public.product_fiscal
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS product_fiscal_service_all ON public.product_fiscal;
CREATE POLICY product_fiscal_service_all ON public.product_fiscal
  TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.fn_sync_product_fiscal_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
-- fix_version: satellite_fiscal_20260627
-- anti-regression: manter SECURITY DEFINER + search_path.
BEGIN
  INSERT INTO public.product_fiscal (
    product_id, ncm_id, ncm_code, ipi_rate, tax_reference_state, updated_at
  )
  VALUES (
    NEW.id, NEW.ncm_id, NEW.ncm_code, NEW.ipi_rate, NEW.tax_reference_state, now()
  )
  ON CONFLICT (product_id) DO UPDATE SET
    ncm_id              = EXCLUDED.ncm_id,
    ncm_code            = EXCLUDED.ncm_code,
    ipi_rate            = EXCLUDED.ipi_rate,
    tax_reference_state = EXCLUDED.tax_reference_state,
    updated_at          = now();
  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.fn_sync_product_fiscal_on_change() IS
'[fix_version:satellite_fiscal_20260627] Trigger: UPSERT em product_fiscal. Não remover.';

DROP TRIGGER IF EXISTS trg_sync_product_fiscal ON public.products;
CREATE TRIGGER trg_sync_product_fiscal
  AFTER INSERT OR UPDATE OF
    ncm_id, ncm_code, ipi_rate, tax_reference_state
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_product_fiscal_on_change();

-- Backfill
INSERT INTO public.product_fiscal (
  product_id, ncm_id, ncm_code, ipi_rate, tax_reference_state
)
SELECT
  id, ncm_id, ncm_code, ipi_rate, tax_reference_state
FROM products
WHERE ncm_code IS NOT NULL OR ncm_id IS NOT NULL OR ipi_rate IS NOT NULL
ON CONFLICT (product_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';;
