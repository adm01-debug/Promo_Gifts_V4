-- Passo 1: Criar coluna de disponibilidade na tabela normalizada
ALTER TABLE variant_supplier_sources 
ADD COLUMN supplier_availability_status varchar(20);

COMMENT ON COLUMN variant_supplier_sources.supplier_availability_status 
IS 'Status de disponibilidade do fornecedor (SIM, CONSULTE, INDISPONÍVEL). Fonte: API /ruiz/consultaEstoque campo Disponivel';
