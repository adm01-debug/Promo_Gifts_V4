-- ============================================================
-- Campos que faltam em suppliers (estavam sendo salvos no notes via regex)
-- ============================================================

-- Inscrição Estadual principal do fornecedor
ALTER TABLE public.suppliers
  ADD COLUMN inscricao_estadual VARCHAR(20);

-- Segundo telefone
ALTER TABLE public.suppliers
  ADD COLUMN phone2 VARCHAR(30);

-- Logo (URL da imagem do fornecedor)
ALTER TABLE public.suppliers
  ADD COLUMN logo_url TEXT;

COMMENT ON COLUMN public.suppliers.inscricao_estadual IS 'IE principal do fornecedor (da matriz). Para IE de filiais, usar supplier_branches.inscricao_estadual';
COMMENT ON COLUMN public.suppliers.phone2 IS 'Telefone fixo secundário';
COMMENT ON COLUMN public.suppliers.logo_url IS 'URL do logo do fornecedor';
