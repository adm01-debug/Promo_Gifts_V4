
-- Passo 6 v2: Asia Import — mapear 13 produtos sem category_id + criar assignments (com cast)

UPDATE products
SET category_id = CASE
    WHEN sku = 'SVT010P' THEN '6f595c2f-907d-4b0b-9f62-13eef959aa0c'::uuid
    WHEN sku = 'LC210P'  THEN '402679eb-bb0e-48d2-bea2-4da27239b995'::uuid
    WHEN sku IN ('PL01PP','PL02PP','PL05PP','PL04','PL05') 
                         THEN 'd9fbf215-1841-4f2b-9a7c-e5b0238fbcda'::uuid
    WHEN sku = 'PCA100P' THEN 'd9fbf215-1841-4f2b-9a7c-e5b0238fbcda'::uuid
    WHEN sku IN ('PA150P','PA140P') 
                         THEN '1f004c4e-0d01-47b9-9b97-0fc4d8bca2d1'::uuid
    WHEN sku IN ('PCL100P','PCL120PP') 
                         THEN 'd9fbf215-1841-4f2b-9a7c-e5b0238fbcda'::uuid
    WHEN sku = 'PT1050P' THEN 'e6134500-5231-4de4-b69b-fbf3970572fa'::uuid
  END,
  updated_at = now()
WHERE supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'
  AND is_active = true
  AND sku IN ('SVT010P','LC210P','PL01PP','PL02PP','PL05PP','PL04','PL05',
              'PCA100P','PA150P','PA140P','PCL100P','PCL120PP','PT1050P');

-- Criar assignments primários para os 13 recém-mapeados
INSERT INTO product_category_assignments (product_id, category_id, is_primary, display_order, created_at)
SELECT 
  p.id,
  p.category_id,
  true,
  1,
  now()
FROM products p
WHERE p.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'
  AND p.is_active = true
  AND p.sku IN ('SVT010P','LC210P','PL01PP','PL02PP','PL05PP','PL04','PL05',
                'PCA100P','PA150P','PA140P','PCL100P','PCL120PP','PT1050P')
  AND p.category_id IS NOT NULL
ON CONFLICT (product_id, category_id) DO UPDATE SET is_primary = true;
;
