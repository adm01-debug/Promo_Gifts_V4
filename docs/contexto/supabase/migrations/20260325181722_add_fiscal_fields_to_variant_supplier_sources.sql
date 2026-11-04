-- ============================================================
-- CAMPOS FISCAIS em variant_supplier_sources
-- Vinculados ao fornecedor+filial (variam por UF de origem)
-- ============================================================

-- FK para filial de faturamento
ALTER TABLE public.variant_supplier_sources
  ADD COLUMN supplier_branch_id UUID REFERENCES public.supplier_branches(id);

-- Tributos que variam por fornecedor/UF
ALTER TABLE public.variant_supplier_sources
  ADD COLUMN icms_rate NUMERIC(5,2);           -- ICMS aplicavel nessa operacao

ALTER TABLE public.variant_supplier_sources
  ADD COLUMN pis_rate NUMERIC(5,4);            -- PIS (1.65% presumido ou 0.65% cumulativo)

ALTER TABLE public.variant_supplier_sources
  ADD COLUMN cofins_rate NUMERIC(5,4);         -- COFINS (7.6% presumido ou 3% cumulativo)

ALTER TABLE public.variant_supplier_sources
  ADD COLUMN cfop VARCHAR(4);                  -- Codigo fiscal da operacao (5102, 6102, etc)

ALTER TABLE public.variant_supplier_sources
  ADD COLUMN csosn VARCHAR(4);                 -- Cod. Situacao Operacao Simples Nacional

ALTER TABLE public.variant_supplier_sources
  ADD COLUMN cest VARCHAR(7);                  -- Substituicao tributaria

-- Indice para consultas fiscais
CREATE INDEX idx_vss_supplier_branch ON public.variant_supplier_sources(supplier_branch_id) 
  WHERE supplier_branch_id IS NOT NULL;

-- Comentarios
COMMENT ON COLUMN public.variant_supplier_sources.supplier_branch_id IS 
  'Filial do fornecedor que fatura este item. Define UF de origem para calculo de ICMS.';
COMMENT ON COLUMN public.variant_supplier_sources.icms_rate IS 
  'Aliquota ICMS desta operacao. Depende da UF da filial (supplier_branch) x UF destino.';
COMMENT ON COLUMN public.variant_supplier_sources.cfop IS 
  'CFOP da operacao. Ex: 5102 (venda interna), 6102 (venda interestadual).';
