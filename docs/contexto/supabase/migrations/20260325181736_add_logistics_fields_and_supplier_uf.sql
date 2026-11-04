-- ============================================================
-- CAMPOS LOGISTICOS em products
-- ============================================================
ALTER TABLE public.products
  ADD COLUMN freight_class VARCHAR(20);        -- leve, medio, pesado, volumoso
  
ALTER TABLE public.products
  ADD COLUMN cubic_weight NUMERIC(10,2);       -- Peso cubado (LxAxP/6000) em kg

COMMENT ON COLUMN public.products.freight_class IS 
  'Classificacao de frete: leve, medio, pesado, volumoso. Impacta calculo de frete.';
COMMENT ON COLUMN public.products.cubic_weight IS 
  'Peso cubado em kg (largura_cm x altura_cm x profundidade_cm / 6000). Usado quando maior que peso real.';

-- ============================================================
-- UF principal e regime tributario na tabela suppliers (cache/convenience)
-- ============================================================
ALTER TABLE public.suppliers
  ADD COLUMN state_uf VARCHAR(2);              -- UF principal (da matriz)
  
ALTER TABLE public.suppliers
  ADD COLUMN tax_regime VARCHAR(30);           -- Regime tributario principal

COMMENT ON COLUMN public.suppliers.state_uf IS 
  'UF da matriz do fornecedor. Para filiais especificas, usar supplier_branches.';
