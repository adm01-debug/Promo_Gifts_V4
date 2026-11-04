-- PASSO C: Atualizar variantes XBZ — 8 correções de color_id
-- Usando attributes->>'cor' como fonte de verdade para identificar o fornecedor original

-- 1. AZUL → Azul Royal (1.489 var)
UPDATE product_variants SET
  color_id = 'dd0e1acb-850a-4c0b-87a8-963595ee6508',
  color_name = 'Azul Royal',
  color_hex = '#4169E1',
  updated_at = NOW()
FROM products p JOIN suppliers s ON p.supplier_id = s.id
WHERE product_variants.product_id = p.id AND s.code = 'XBZ'
  AND product_variants.attributes->>'cor' = 'AZUL'
  AND product_variants.color_id = '34b1361e-f965-4aea-b801-2001246c7d1e'; -- era Azul genérica

-- 2. VERDE → Verde Bandeira (906 var)
UPDATE product_variants SET
  color_id = 'd69d8c49-6982-4b37-964e-928bd3eb22bb',
  color_name = 'Verde Bandeira',
  color_hex = '#009739',
  updated_at = NOW()
FROM products p JOIN suppliers s ON p.supplier_id = s.id
WHERE product_variants.product_id = p.id AND s.code = 'XBZ'
  AND product_variants.attributes->>'cor' = 'VERDE'
  AND product_variants.color_id = 'd102d6cc-664b-4e6a-828b-df1a469c1e61'; -- era Verde Neon

-- 3. VERMELHO → Vermelho Ferrari (888 var)
UPDATE product_variants SET
  color_id = '7e4cc99c-e5d5-4dd6-a616-201dbb95f84f',
  color_name = 'Vermelho Ferrari',
  color_hex = '#D40000',
  updated_at = NOW()
FROM products p JOIN suppliers s ON p.supplier_id = s.id
WHERE product_variants.product_id = p.id AND s.code = 'XBZ'
  AND product_variants.attributes->>'cor' = 'VERMELHO'
  AND product_variants.color_id = '1a88e747-d496-4614-96e2-19f800c0f922'; -- era Vermelho Bordô

-- 4. ROSA → Rosa Bubbaloo (699 var)
UPDATE product_variants SET
  color_id = 'caa740e7-a292-4aff-b54f-36437eaba652',
  color_name = 'Rosa Bubbaloo',
  color_hex = '#E91E63',
  updated_at = NOW()
FROM products p JOIN suppliers s ON p.supplier_id = s.id
WHERE product_variants.product_id = p.id AND s.code = 'XBZ'
  AND product_variants.attributes->>'cor' = 'ROSA'
  AND product_variants.color_id = '81ab1f0f-6db5-4b5d-9364-a1b8b0c2ad84'; -- era Rosa Bebê

-- 5. ROXO → Roxo Púrpura (276 var)
UPDATE product_variants SET
  color_id = '56dd484f-b17f-47d2-a8ae-f6612069227d',
  color_name = 'Roxo Púrpura',
  color_hex = '#800080',
  updated_at = NOW()
FROM products p JOIN suppliers s ON p.supplier_id = s.id
WHERE product_variants.product_id = p.id AND s.code = 'XBZ'
  AND product_variants.attributes->>'cor' = 'ROXO'
  AND product_variants.color_id = 'abc41b40-b938-4e39-bb16-12ee05578535'; -- era Roxo Lilás

-- 6. CINZA → Cinza Claro (219 var)
UPDATE product_variants SET
  color_id = '26255075-2383-45e3-b979-316c5e22d2f3',
  color_name = 'Cinza Claro',
  color_hex = '#C0C0C0',
  updated_at = NOW()
FROM products p JOIN suppliers s ON p.supplier_id = s.id
WHERE product_variants.product_id = p.id AND s.code = 'XBZ'
  AND product_variants.attributes->>'cor' = 'CINZA'
  AND product_variants.color_id = 'beb6fa6a-eca8-4b9e-b861-b4a12c2c0020'; -- era Cinza genérica

-- 7. MARROM → Marrom Chocolate (160 var)
UPDATE product_variants SET
  color_id = '096c51ff-8dbd-402d-88c1-5ca83e856354',
  color_name = 'Marrom Chocolate',
  color_hex = '#5C4033',
  updated_at = NOW()
FROM products p JOIN suppliers s ON p.supplier_id = s.id
WHERE product_variants.product_id = p.id AND s.code = 'XBZ'
  AND product_variants.attributes->>'cor' = 'MARROM'
  AND product_variants.color_id = 'ad35ed9b-9c05-4f1c-a922-a96c73c275d3'; -- era Marrom Café
