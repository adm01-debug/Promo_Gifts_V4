UPDATE products SET primary_image_url = NULL WHERE is_active = false AND primary_image_url IS NOT NULL;
206 produtos inativos com phantom primary_image_url → NULL;
Zero pedidos ativos afetados (verificado via quote_items + quotes);
7153 produtos ativos intactos (100% com primary_image_url);
