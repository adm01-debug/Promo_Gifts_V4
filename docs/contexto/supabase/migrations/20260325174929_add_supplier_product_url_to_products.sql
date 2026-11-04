-- Criar campo supplier_product_url na tabela products
-- Armazena o link direto da pagina do produto no site do fornecedor
ALTER TABLE public.products 
  ADD COLUMN supplier_product_url TEXT;

-- Comentario documentando o campo
COMMENT ON COLUMN public.products.supplier_product_url IS 
  'URL da pagina do produto no site do fornecedor (ex: https://www.xbzbrindes.com.br/09139a). Auto-gerado via padrao do fornecedor + supplier_reference. Pode ser editado manualmente.';

-- Indice para consultas de auditoria
CREATE INDEX idx_products_supplier_product_url ON public.products(supplier_product_url) WHERE supplier_product_url IS NOT NULL;
