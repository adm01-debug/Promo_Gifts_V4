-- ETAPA 4A: Para os 34 que JA TEM assignment correto: swap is_primary
-- Passo 1: Desmarcar o primary atual (errado)
UPDATE product_category_assignments pca
SET is_primary = false
FROM products p
WHERE pca.product_id = p.id 
  AND pca.is_primary = true 
  AND pca.category_id != p.category_id
  AND EXISTS (
    SELECT 1 FROM product_category_assignments pca2 
    WHERE pca2.product_id = p.id AND pca2.category_id = p.category_id
  );

-- Passo 2: Marcar o assignment correto como primary
UPDATE product_category_assignments pca
SET is_primary = true
FROM products p
WHERE pca.product_id = p.id 
  AND pca.category_id = p.category_id
  AND pca.is_primary = false
  AND NOT EXISTS (
    SELECT 1 FROM product_category_assignments pca3
    WHERE pca3.product_id = p.id AND pca3.is_primary = true
  );
