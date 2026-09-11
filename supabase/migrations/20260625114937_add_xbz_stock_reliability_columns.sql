-- Rastreabilidade de confiabilidade de estoque XBZ
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS xbz_stock_reliability_id smallint,
  ADD COLUMN IF NOT EXISTS xbz_stock_reliability_text text;

COMMENT ON COLUMN public.products.xbz_stock_reliability_id IS
  'ID numérico do status de confiabilidade de estoque XBZ (IdStatusConfiabilidade). Valor conhecido: 10 = estoque confirmado por inventário recente. NULL = não informado ou fornecedor diferente de XBZ.';

COMMENT ON COLUMN public.products.xbz_stock_reliability_text IS
  'Descrição completa do status de confiabilidade de estoque XBZ (StatusConfiabilidade). Ex.: "Quantidade CONFIÁVEL. Confirmada através de inventário realizado recentemente." Atualizado via sync.';

-- Índice parcial: facilita filtrar produtos com estoque confiável
CREATE INDEX IF NOT EXISTS idx_products_xbz_reliability
  ON public.products (xbz_stock_reliability_id)
  WHERE xbz_stock_reliability_id IS NOT NULL;;
