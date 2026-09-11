
-- Passo 5 final: mapear os 3 XBZ restantes + criar assignments para todos os 104 mapeados

-- 1. Mapear os 3 que ainda não têm categoria
UPDATE products
SET category_id = 'd9fbf215-1841-4f2b-9a7c-e5b0238fbcda',
    updated_at = now()
WHERE sku IN ('19141','19141A','P$CX7146')
  AND supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900'
  AND is_active = true;

-- 2. Criar assignments primários para TODOS os XBZ que agora têm category_id mas sem primário
-- (inclui os 48 do UPDATE anterior + os 3 recém-mapeados = 51 produtos)
INSERT INTO product_category_assignments (product_id, category_id, is_primary, display_order, created_at)
SELECT 
  p.id,
  p.category_id,
  true,
  1,
  now()
FROM products p
WHERE p.supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900'
  AND p.is_active = true
  AND p.category_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM product_category_assignments pca 
    WHERE pca.product_id = p.id AND pca.is_primary = true
  )
  AND NOT EXISTS (
    SELECT 1 FROM product_category_assignments pca2
    WHERE pca2.product_id = p.id AND pca2.category_id = p.category_id
  )
ON CONFLICT (product_id, category_id) DO NOTHING;

-- 3. Para os que já tinham o category_id na pivot mas não como primário
INSERT INTO product_category_assignments (product_id, category_id, is_primary, display_order, created_at)
SELECT 
  p.id,
  p.category_id,
  true,
  1,
  now()
FROM products p
WHERE p.supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900'
  AND p.is_active = true
  AND p.category_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM product_category_assignments pca 
    WHERE pca.product_id = p.id AND pca.is_primary = true
  )
ON CONFLICT (product_id, category_id) DO UPDATE SET is_primary = true;
;
