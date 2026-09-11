COMMENT ON TABLE public.supplier_category_mappings IS
'DE>PARA de categorias GLOBAL (compartilhado entre fornecedores). Decisao de modelagem registrada em 2026-06-06: esta tabela NAO possui coluna supplier_id — o mapeamento e chaveado por supplier_category_id -> category_id (canonica) e vale para todos os fornecedores (ASIA, SPOT, XBZ, SM). Difere de supplier_colors e supplier_field_mappings, que sao POR-FORNECEDOR (possuem supplier_id). O campo confidence indica a forca/qualidade do match.';

COMMENT ON COLUMN public.supplier_category_mappings.supplier_category_id IS
'Chave do de-para de categorias (escopo GLOBAL, sem supplier_id): identificador de categoria do fornecedor que mapeia para category_id canonica.';

COMMENT ON COLUMN public.supplier_category_mappings.category_id IS
'Categoria canonica (Gold) destino do de-para.';;
