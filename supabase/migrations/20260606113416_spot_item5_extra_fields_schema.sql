ALTER TABLE public.produtos_padronizacao
  ADD COLUMN IF NOT EXISTS certificates       jsonb,
  ADD COLUMN IF NOT EXISTS certificate_files  jsonb,
  ADD COLUMN IF NOT EXISTS weight_gr          text,
  ADD COLUMN IF NOT EXISTS related_references jsonb,
  ADD COLUMN IF NOT EXISTS is_seasonal        boolean,
  ADD COLUMN IF NOT EXISTS pvc_free           boolean;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS certificates       jsonb,
  ADD COLUMN IF NOT EXISTS certificate_files  jsonb,
  ADD COLUMN IF NOT EXISTS weight_gr          text,
  ADD COLUMN IF NOT EXISTS related_references jsonb,
  ADD COLUMN IF NOT EXISTS is_seasonal        boolean,
  ADD COLUMN IF NOT EXISTS pvc_free           boolean;

ALTER TABLE public.produtos_padronizacao_variantes
  ADD COLUMN IF NOT EXISTS your_price numeric;
ALTER TABLE public.variant_supplier_sources
  ADD COLUMN IF NOT EXISTS your_price numeric;;
