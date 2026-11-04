-- Adicionar CST e natureza da operacao
ALTER TABLE public.variant_supplier_sources
  ADD COLUMN cst VARCHAR(3);

ALTER TABLE public.variant_supplier_sources
  ADD COLUMN operation_nature VARCHAR(100);

COMMENT ON COLUMN public.variant_supplier_sources.cst IS 
  'Código de Situação Tributária. Ex: 100 (importado tributado), 060 (nacional ST), 500 (nacional produção)';
COMMENT ON COLUMN public.variant_supplier_sources.operation_nature IS 
  'Natureza da operação fiscal. Ex: Venda de Merc. Adquirida de Terceiros, Venda de Produção, Venda com ST';
