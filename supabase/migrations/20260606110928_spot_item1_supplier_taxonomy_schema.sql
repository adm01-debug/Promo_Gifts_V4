-- Silver parent: taxonomia crua do fornecedor
ALTER TABLE public.produtos_padronizacao
  ADD COLUMN IF NOT EXISTS supplier_type        text,
  ADD COLUMN IF NOT EXISTS supplier_type_code   text,
  ADD COLUMN IF NOT EXISTS supplier_subtype      text,
  ADD COLUMN IF NOT EXISTS supplier_subtype_code text;

-- Gold: taxonomia crua do fornecedor (rastreabilidade + remapeamento futuro)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS supplier_type        text,
  ADD COLUMN IF NOT EXISTS supplier_type_code   text,
  ADD COLUMN IF NOT EXISTS supplier_subtype      text,
  ADD COLUMN IF NOT EXISTS supplier_subtype_code text;

-- De-para SubType (fornecedor) -> categoria canônica
CREATE TABLE IF NOT EXISTS public.supplier_subtype_category_map (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id   uuid NOT NULL,
  subtype_desc  text NOT NULL,
  subtype_code  text,
  category_id   uuid REFERENCES public.categories(id),
  match_method  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, subtype_desc)
);
CREATE INDEX IF NOT EXISTS idx_subtype_map_supplier ON public.supplier_subtype_category_map(supplier_id);;
