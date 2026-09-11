ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS modo_de_uso text;

COMMENT ON COLUMN public.products.modo_de_uso IS
  'Instruções de uso do produto, conforme publicado na página do produto XBZ (site_data.modo_de_uso). Campo informativo, não operacional.';;
