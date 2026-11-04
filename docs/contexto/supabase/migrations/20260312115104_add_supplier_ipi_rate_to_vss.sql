ALTER TABLE variant_supplier_sources 
ADD COLUMN supplier_ipi_rate numeric;

COMMENT ON COLUMN variant_supplier_sources.supplier_ipi_rate 
IS 'Alíquota de IPI informada pelo fornecedor para este SKU. Fonte XBZ: campo IpiTaxa da API /ruiz/consultaEstoque. NULL = fornecedor não informou.';
