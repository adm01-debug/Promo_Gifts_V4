-- ============================================================
-- TABELA: supplier_branches (Filiais de Fornecedores)
-- Resolve: Spot (MG/SP), Asia (SC/SP) com 2 locais de faturamento
-- ============================================================

CREATE TABLE public.supplier_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  
  -- Identificacao da filial
  branch_name VARCHAR(100) NOT NULL,          -- "Matriz MG", "Filial SP"
  branch_code VARCHAR(20),                     -- Codigo interno (ex: "SPOT-MG", "SPOT-SP")
  cnpj VARCHAR(18),                            -- CNPJ da filial (XX.XXX.XXX/XXXX-XX)
  inscricao_estadual VARCHAR(20),              -- IE da filial
  
  -- Localizacao (impacta ICMS)
  state_uf VARCHAR(2) NOT NULL,                -- UF de faturamento (MG, SP, SC, GO)
  city VARCHAR(100),                           -- Cidade
  address TEXT,                                -- Endereco completo
  
  -- Regime tributario (impacta PIS/COFINS/CSOSN)
  tax_regime VARCHAR(30) DEFAULT 'lucro_presumido',  -- simples_nacional, lucro_presumido, lucro_real
  
  -- Aliquotas padrao DESSA filial
  icms_internal_rate NUMERIC(5,2),             -- ICMS interno (dentro do estado)
  icms_interstate_rate NUMERIC(5,2),           -- ICMS interestadual padrao (saindo do estado)
  default_cfop_internal VARCHAR(4),            -- CFOP venda interna (ex: 5102)
  default_cfop_interstate VARCHAR(4),          -- CFOP venda interestadual (ex: 6102)
  
  -- Controle
  is_default BOOLEAN DEFAULT false,            -- Filial padrao para faturamento
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  UNIQUE(supplier_id, branch_code),
  UNIQUE(supplier_id, cnpj)
);

-- Trigger de updated_at
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.supplier_branches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indices
CREATE INDEX idx_supplier_branches_supplier ON public.supplier_branches(supplier_id);
CREATE INDEX idx_supplier_branches_uf ON public.supplier_branches(state_uf);

-- Comentario
COMMENT ON TABLE public.supplier_branches IS 
  'Filiais de fornecedores. Cada fornecedor pode faturar de UFs diferentes (ex: Spot MG/SP, Asia SC/SP). A UF da filial impacta diretamente o calculo de ICMS e CFOP.';
