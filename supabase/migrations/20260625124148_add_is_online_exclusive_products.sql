-- Coluna para produtos exclusivos do canal online (Spot: OnlineExclusive=true)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_online_exclusive boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.products.is_online_exclusive IS
  'Indica produto de venda exclusiva pelo canal online no fornecedor Spot/Stricker (OnlineExclusive=true). Atualizado via sync. DEFAULT false para todos os fornecedores que não usam este flag.';;
