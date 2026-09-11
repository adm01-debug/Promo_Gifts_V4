ALTER TABLE public.product_kit_components
  ADD COLUMN IF NOT EXISTS dim_source     varchar(20),
  ADD COLUMN IF NOT EXISTS dim_source_url text;

COMMENT ON COLUMN public.product_kit_components.dim_source IS
  'Procedencia das medidas do componente: ficha (PDF tecnico do fornecedor = REAL por peca), supplier_api, heuristic (estimado/copiado da caixa do kit), manual. NULL=legado/desconhecido. Politica: parse de ficha so sobrescreve heuristic/NULL/supplier_api, nunca ficha/manual.';
COMMENT ON COLUMN public.product_kit_components.dim_source_url IS
  'URL da fonte que originou as medidas (ex.: ficha_tecnica_pdf da XBZ).';

-- Backfill honesto: dimensoes pre-existentes vieram da heuristica de decomposicao
-- (a fonte do fornecedor nunca teve medida por peca; so o PDF tem, e ainda nao foi parseado).
UPDATE public.product_kit_components
SET dim_source='heuristic'
WHERE dim_source IS NULL
  AND kit_product_id <> (SELECT id FROM public.products WHERE sku='19168')
  AND (length_mm IS NOT NULL OR width_mm IS NOT NULL OR height_mm IS NOT NULL OR diameter_mm IS NOT NULL
       OR pkg_ext_length_mm IS NOT NULL OR pkg_ext_width_mm IS NOT NULL OR pkg_ext_height_mm IS NOT NULL);

-- 19168: medidas vieram da ficha tecnica REAL
UPDATE public.product_kit_components
SET dim_source='ficha', dim_source_url='https://www.xbzbrindes.com.br/getPdfProduto/28724'
WHERE kit_product_id=(SELECT id FROM public.products WHERE sku='19168');;
