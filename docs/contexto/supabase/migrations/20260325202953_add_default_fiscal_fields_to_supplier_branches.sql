-- ============================================================
-- Campos DEFAULT fiscais em supplier_branches
-- Para herança automática ao vincular produto a fornecedor
-- ============================================================

ALTER TABLE public.supplier_branches
  ADD COLUMN default_cst VARCHAR(3);

ALTER TABLE public.supplier_branches
  ADD COLUMN default_pis_rate NUMERIC(5,4);

ALTER TABLE public.supplier_branches
  ADD COLUMN default_cofins_rate NUMERIC(5,4);

ALTER TABLE public.supplier_branches
  ADD COLUMN default_csosn VARCHAR(4);

ALTER TABLE public.supplier_branches
  ADD COLUMN default_cest VARCHAR(7);

ALTER TABLE public.supplier_branches
  ADD COLUMN default_operation_nature VARCHAR(100);

COMMENT ON COLUMN public.supplier_branches.default_cst IS 
  'CST padrão dessa filial. Ex: 100 (importado), 500 (nacional), 060 (ST). Herdado por novos produtos vinculados.';
COMMENT ON COLUMN public.supplier_branches.default_pis_rate IS 
  'Alíquota PIS padrão. Herdado por novos produtos vinculados.';
COMMENT ON COLUMN public.supplier_branches.default_cofins_rate IS 
  'Alíquota COFINS padrão. Herdado por novos produtos vinculados.';
COMMENT ON COLUMN public.supplier_branches.default_operation_nature IS 
  'Natureza da operação padrão. Ex: Venda de Produção, Revenda de Terceiros, etc.';
