
-- CORREÇÃO T06: 3 produtos SPOT com categorização errada pelo pipeline
-- Descobertos nos testes exaustivos: pipeline adicionou 21 novos produtos SPOT
-- e categorizou 3 incorretamente (todos em Squeeze|Garrafas ao invés das categorias corretas)

-- 1. Remover assignments ERRADOS (Squeeze|Garrafas|Inox e Squeeze|Garrafas|Metal)
-- para os 3 produtos afetados
DELETE FROM product_category_assignments pca
WHERE pca.product_id IN (
  'a031dd84-1ce1-4e09-bbbc-52a5937c8c2f',  -- 51737 Conjunto de lápis
  '90232c2b-ad91-4d52-9777-84013e84d5a2',  -- 94193 Luva refrigeradora
  '8fe4baa8-439e-42dc-8d93-85447237536f'   -- 98035 Raquetes de praia
)
AND pca.category_id IN (
  SELECT id FROM categories WHERE name IN ('Squeeze | Garrafas | Inox','Squeeze | Garrafas | Metal')
);

-- 2. Atualizar category_id dos 3 produtos para as categorias corretas
-- 51737: "Conjunto de lápis" → Lápis (da9b2663-8c7e-44db-9777-129aadccddff)
UPDATE products SET category_id = 'da9b2663-8c7e-44db-9777-129aadccddff', updated_at = now()
WHERE id = 'a031dd84-1ce1-4e09-bbbc-52a5937c8c2f';

-- 94193: "Luva refrigeradora" = "Artigos para Vinhos" (SPOT) → Acessórios | Vinho
UPDATE products SET category_id = 'c0000000-0000-0000-0000-000000000002', updated_at = now()
WHERE id = '90232c2b-ad91-4d52-9777-84013e84d5a2';

-- 98035: "Raquetes de praia" = "Jogos de Praia" (SPOT) → Esportes | Aventura | Lazer | Viagem
UPDATE products SET category_id = 'a78025d7-d1ad-4f18-9d78-37ca1d1fbe01', updated_at = now()
WHERE id = '8fe4baa8-439e-42dc-8d93-85447237536f';

-- 3. Criar assignments primários com as categorias corretas
INSERT INTO product_category_assignments (product_id, category_id, is_primary, display_order, created_at)
VALUES
  ('a031dd84-1ce1-4e09-bbbc-52a5937c8c2f', 'da9b2663-8c7e-44db-9777-129aadccddff', true, 1, now()),
  ('90232c2b-ad91-4d52-9777-84013e84d5a2', 'c0000000-0000-0000-0000-000000000002', true, 1, now()),
  ('8fe4baa8-439e-42dc-8d93-85447237536f', 'a78025d7-d1ad-4f18-9d78-37ca1d1fbe01', true, 1, now())
ON CONFLICT (product_id, category_id) DO UPDATE SET is_primary = true;

-- 4. Registrar estes subtypes no supplier_subtype_category_map para evitar recorrência
-- (previne o pipeline de recategorizar incorretamente no futuro)
INSERT INTO supplier_subtype_category_map (
  id, supplier_id, subtype_code, subtype_desc, category_id, match_method, created_at, updated_at
)
VALUES
  (gen_random_uuid(), 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0',
   '0160', 'Lápis',
   'da9b2663-8c7e-44db-9777-129aadccddff',
   'manual', now(), now()),
  (gen_random_uuid(), 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0',
   '0911', 'Jogos de Praia',
   'a78025d7-d1ad-4f18-9d78-37ca1d1fbe01',
   'manual', now(), now()),
  (gen_random_uuid(), 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0',
   '102', 'Artigos para Vinhos',
   'c0000000-0000-0000-0000-000000000002',
   'manual', now(), now())
ON CONFLICT DO NOTHING;
;
