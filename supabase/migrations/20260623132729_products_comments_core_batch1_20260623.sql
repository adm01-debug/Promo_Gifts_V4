
-- Batch 1: Core/Identidade + Preço + Estoque
COMMENT ON COLUMN public.products.cost_price IS 'Custo do fornecedor. Null em v_products_public (segurança). Fonte: pipeline.';
COMMENT ON COLUMN public.products.suggested_price IS 'Preço sugerido do fornecedor. ~97% preenchido. Pode diferir do sale_price calculado.';
COMMENT ON COLUMN public.products.short_description IS 'Descrição curta para cards e listagens. Texto plano. Complementa description.';
COMMENT ON COLUMN public.products.brand IS 'Marca do produto. 100% preenchido. Fonte: pipeline de importação.';
COMMENT ON COLUMN public.products.main_category_id IS 'Categoria canônica (FK→categories). Usada para leaf_category e SEO. Pode diferir de category_id.';
COMMENT ON COLUMN public.products.sale_price IS 'Preço de venda (cost × markup). Mantido por trigger. Exibido no frontend.';
COMMENT ON COLUMN public.products.stock_quantity IS 'Estoque total denormalizado. Cache da soma de variant_supplier_sources. Mantido por trg_sync_stock_*.';
COMMENT ON COLUMN public.products.min_quantity IS 'Quantidade mínima de venda. 15 valores distintos (1,5,10,25,...).';
COMMENT ON COLUMN public.products.min_order_quantity IS 'Override de mínimo por produto. 57% preenchido. NULL→herda categoria.';
COMMENT ON COLUMN public.products.last_stock_update_at IS 'Último update de estoque. 30% preenchido. Auditoria de frescor.';
;
