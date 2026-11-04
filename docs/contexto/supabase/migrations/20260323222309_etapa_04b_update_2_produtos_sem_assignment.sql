-- ETAPA 4B: Para os 2 restantes que NAO tem assignment correto: UPDATE direto
UPDATE product_category_assignments pca
SET category_id = p.category_id
FROM products p
WHERE pca.product_id = p.id 
  AND pca.is_primary = true 
  AND pca.category_id != p.category_id
  AND NOT EXISTS (
    SELECT 1 FROM product_category_assignments pca2 
    WHERE pca2.product_id = p.id AND pca2.category_id = p.category_id
  );
