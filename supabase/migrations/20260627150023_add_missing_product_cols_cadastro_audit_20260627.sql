-- ============================================================================
-- AUDITORIA CADASTRO DE PRODUTOS (2026-06-27) — fix_version=cadastro-produtos-audit-20260627-v1
-- Objetivo: o formulário "Novo Produto" enviava colunas-fantasma (PGRST204/42703)
-- e perdia silenciosamente dados fiscais/logísticos. Esta migração ADITIVA cria os
-- 25 campos que o form já coleta (Zod) para que os dados aterrissem na tabela.
-- ANTI-REGRESSAO: NÃO recriar a coluna products.active (removida pelo medalhão de propósito).
-- Idempotente: ADD COLUMN IF NOT EXISTS + guards de constraint (runner do Supabase re-aplica migrations).
-- ============================================================================

-- 1) Colunas (idempotente)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ean varchar(20),
  ADD COLUMN IF NOT EXISTS gtin varchar(20),
  ADD COLUMN IF NOT EXISTS icms_rate numeric(5,2),
  ADD COLUMN IF NOT EXISTS pis_rate numeric(5,2),
  ADD COLUMN IF NOT EXISTS cofins_rate numeric(5,2),
  ADD COLUMN IF NOT EXISTS cfop varchar(10),
  ADD COLUMN IF NOT EXISTS csosn varchar(10),
  ADD COLUMN IF NOT EXISTS cest varchar(10),
  ADD COLUMN IF NOT EXISTS tax_regime varchar(50),
  ADD COLUMN IF NOT EXISTS is_on_sale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_on_sale_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS internal_diameter_cm numeric(8,2),
  ADD COLUMN IF NOT EXISTS packaging_color varchar(100),
  ADD COLUMN IF NOT EXISTS packaging_finish varchar(100),
  ADD COLUMN IF NOT EXISTS key_benefits text[],
  ADD COLUMN IF NOT EXISTS use_cases text[],
  ADD COLUMN IF NOT EXISTS warranty_months integer,
  ADD COLUMN IF NOT EXISTS shipping_weight_kg numeric(10,3),
  ADD COLUMN IF NOT EXISTS shipping_width_cm numeric(8,2),
  ADD COLUMN IF NOT EXISTS shipping_height_cm numeric(8,2),
  ADD COLUMN IF NOT EXISTS shipping_length_cm numeric(8,2),
  ADD COLUMN IF NOT EXISTS freight_class varchar(50),
  ADD COLUMN IF NOT EXISTS default_carrier varchar(100),
  ADD COLUMN IF NOT EXISTS requires_special_shipping boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shipping_notes varchar(500);

-- 2) CHECKs fiscais 0..100 (espelham chk_products_ipi_rate_range) — guard idempotente
DO $mig$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.products'::regclass AND conname='chk_products_icms_rate_range') THEN
    ALTER TABLE public.products ADD CONSTRAINT chk_products_icms_rate_range
      CHECK (icms_rate IS NULL OR (icms_rate >= 0 AND icms_rate <= 100));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.products'::regclass AND conname='chk_products_pis_rate_range') THEN
    ALTER TABLE public.products ADD CONSTRAINT chk_products_pis_rate_range
      CHECK (pis_rate IS NULL OR (pis_rate >= 0 AND pis_rate <= 100));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.products'::regclass AND conname='chk_products_cofins_rate_range') THEN
    ALTER TABLE public.products ADD CONSTRAINT chk_products_cofins_rate_range
      CHECK (cofins_rate IS NULL OR (cofins_rate >= 0 AND cofins_rate <= 100));
  END IF;
END
$mig$;

-- 3) Comentários com marcador fix_version (anti-regressão / rastreabilidade)
COMMENT ON COLUMN public.products.ean IS 'Código de barras EAN. fix_version=cadastro-produtos-audit-20260627-v1';
COMMENT ON COLUMN public.products.gtin IS 'GTIN. fix_version=cadastro-produtos-audit-20260627-v1';
COMMENT ON COLUMN public.products.icms_rate IS 'Alíquota ICMS (%). CHECK 0-100. fix_version=cadastro-produtos-audit-20260627-v1';
COMMENT ON COLUMN public.products.pis_rate IS 'Alíquota PIS (%). CHECK 0-100. fix_version=cadastro-produtos-audit-20260627-v1';
COMMENT ON COLUMN public.products.cofins_rate IS 'Alíquota COFINS (%). CHECK 0-100. fix_version=cadastro-produtos-audit-20260627-v1';
COMMENT ON COLUMN public.products.cfop IS 'CFOP. fix_version=cadastro-produtos-audit-20260627-v1';
COMMENT ON COLUMN public.products.csosn IS 'CSOSN (Simples). fix_version=cadastro-produtos-audit-20260627-v1';
COMMENT ON COLUMN public.products.cest IS 'CEST. fix_version=cadastro-produtos-audit-20260627-v1';
COMMENT ON COLUMN public.products.tax_regime IS 'Regime tributário. fix_version=cadastro-produtos-audit-20260627-v1';
COMMENT ON COLUMN public.products.is_on_sale IS 'Flag promoção. SEM requires-expires (evita novo crash). fix_version=cadastro-produtos-audit-20260627-v1';
COMMENT ON COLUMN public.products.is_on_sale_expires_at IS 'Expiração da promoção. fix_version=cadastro-produtos-audit-20260627-v1';
COMMENT ON COLUMN public.products.internal_diameter_cm IS 'Diâmetro interno (cm). fix_version=cadastro-produtos-audit-20260627-v1';
COMMENT ON COLUMN public.products.packaging_color IS 'Cor da embalagem. fix_version=cadastro-produtos-audit-20260627-v1';
COMMENT ON COLUMN public.products.packaging_finish IS 'Acabamento da embalagem. fix_version=cadastro-produtos-audit-20260627-v1';
COMMENT ON COLUMN public.products.key_benefits IS 'Benefícios-chave (array). fix_version=cadastro-produtos-audit-20260627-v1';
COMMENT ON COLUMN public.products.use_cases IS 'Casos de uso (array). fix_version=cadastro-produtos-audit-20260627-v1';
COMMENT ON COLUMN public.products.warranty_months IS 'Garantia (meses). fix_version=cadastro-produtos-audit-20260627-v1';
COMMENT ON COLUMN public.products.shipping_weight_kg IS 'Peso para frete (kg). fix_version=cadastro-produtos-audit-20260627-v1';
COMMENT ON COLUMN public.products.shipping_width_cm IS 'Largura p/ frete (cm). fix_version=cadastro-produtos-audit-20260627-v1';
COMMENT ON COLUMN public.products.shipping_height_cm IS 'Altura p/ frete (cm). fix_version=cadastro-produtos-audit-20260627-v1';
COMMENT ON COLUMN public.products.shipping_length_cm IS 'Comprimento p/ frete (cm). fix_version=cadastro-produtos-audit-20260627-v1';
COMMENT ON COLUMN public.products.freight_class IS 'Classe de frete. fix_version=cadastro-produtos-audit-20260627-v1';
COMMENT ON COLUMN public.products.default_carrier IS 'Transportadora padrão. fix_version=cadastro-produtos-audit-20260627-v1';
COMMENT ON COLUMN public.products.requires_special_shipping IS 'Exige frete especial. fix_version=cadastro-produtos-audit-20260627-v1';
COMMENT ON COLUMN public.products.shipping_notes IS 'Observações de frete. fix_version=cadastro-produtos-audit-20260627-v1';

-- 4) Recarrega cache do PostgREST para expor as novas colunas imediatamente
NOTIFY pgrst, 'reload schema';;
