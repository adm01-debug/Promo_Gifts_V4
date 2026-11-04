ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS ux_products_external_id_not_null
  ON public.products (external_id)
  WHERE external_id IS NOT NULL;
