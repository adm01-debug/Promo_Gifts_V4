-- Coluna para produtos em ponta de estoque (WebTipo='PONTA DE ESTOQUE' no XBZ)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_closeout boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.products.is_closeout IS
  'Indica produto em ponta de estoque / liquidação no fornecedor XBZ (WebTipo=PONTA DE ESTOQUE). Atualizado via sync. Não afeta is_active — produto pode ser ativo e em liquidação simultaneamente.';;
