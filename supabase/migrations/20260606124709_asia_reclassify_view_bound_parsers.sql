COMMENT ON FUNCTION public.parse_asia_price(jsonb) IS
'RETIDA (nao remover): consumida por 7 views de diagnostico ASIA (vw_asia_products_by_category/by_color/by_tag/low_stock/pending/promo/stats). Era parser do pipeline legado; o pipeline canonico usa fn_standardize_variant. Para remover: repontar as views para a camada DE>PARA (produtos_padronizacao*) e so entao DROP.';

COMMENT ON FUNCTION public.parse_asia_stock(jsonb) IS
'RETIDA (nao remover): consumida pelas 7 views de diagnostico ASIA (vw_asia_products_*). Estoque canonico vive em produtos_padronizacao_variantes.stock_quantity (via fn_process_asia_stock_pending / fn_standardize_variant). Para remover: repontar as views para a DE>PARA.';

COMMENT ON FUNCTION public.parse_asia_categories(jsonb) IS
'RETIDA (nao remover): consumida por 4 views ASIA (vw_asia_products_by_category/low_stock/pending/promo). Para remover: repontar as views para a DE>PARA + supplier_category_mappings.';

COMMENT ON FUNCTION public.parse_asia_colors(jsonb) IS
'RETIDA (nao remover): consumida pela view vw_asia_products_by_color. Para remover: repontar a view para produtos_padronizacao_variantes.color_*.';

COMMENT ON FUNCTION public.parse_asia_tags(jsonb) IS
'RETIDA (nao remover): consumida pela view vw_asia_products_by_tag. Para remover: repontar a view para a DE>PARA.';

COMMENT ON FUNCTION public.parse_asia_media(jsonb) IS
'RETIDA (nao remover): consumida pela view vw_asia_products_stats. Para remover: repontar a view para a DE>PARA.';;
