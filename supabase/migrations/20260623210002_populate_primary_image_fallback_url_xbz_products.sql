UPDATE products SET primary_image_fallback_url = url_original FROM product_images;
74 produtos preenchidos (72 XBZ + 2 outros) com url_original como fallback CDN;
51 produtos sem url_original em nenhuma imagem — estado correto, sem ação;
Mesma lógica de prioridade do fn_sync_product_images_to_products;
