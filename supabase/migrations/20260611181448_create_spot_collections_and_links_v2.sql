
-- Passo 7 v2: Criar 4 collections SPOT + popular collection_products (coluna correta: created_at)

INSERT INTO collections (
  id, user_id, name, description, icon, icon_color,
  is_featured, is_public, is_deleted, created_at, updated_at
) VALUES
  (
    gen_random_uuid(),
    '75921d8b-611f-4413-9ce5-afccdb733d26',
    'Our Nature',
    'Linha sustentável e ecológica SPOT — produtos com responsabilidade ambiental, materiais naturais e certificações verdes.',
    '🌱',
    '#1D9E75',
    true, true, false, now(), now()
  ),
  (
    gen_random_uuid(),
    '75921d8b-611f-4413-9ce5-afccdb733d26',
    'Novidades SPOT',
    'Lançamentos recentes do catálogo SPOT — os produtos mais novos em primeira mão.',
    '🆕',
    '#185FA5',
    true, true, false, now(), now()
  ),
  (
    gen_random_uuid(),
    '75921d8b-611f-4413-9ce5-afccdb733d26',
    'Time Vai Brasil 2026',
    'Coleção especial Copa do Mundo 2026 — brindes temáticos para torcer pelo Brasil.',
    '🇧🇷',
    '#BA7517',
    true, true, false, now(), now()
  ),
  (
    gen_random_uuid(),
    '75921d8b-611f-4413-9ce5-afccdb733d26',
    'Últimas Chegadas',
    'Produtos mais recentemente adicionados ao catálogo SPOT — sempre fresquinhos.',
    '⚡',
    '#534AB7',
    true, true, false, now(), now()
  )
ON CONFLICT DO NOTHING;

-- Our Nature
INSERT INTO collection_products (collection_id, product_id, display_order, created_at)
SELECT DISTINCT c.id, p.id,
  ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY p.sku),
  now()
FROM collections c
CROSS JOIN (
  SELECT DISTINCT p2.id, p2.sku
  FROM supplier_products_raw spr
  JOIN products p2 ON p2.sku = spr.raw_data->>'ProdReference'
    AND p2.supplier_id = spr.supplier_id
  WHERE spr.supplier_id = 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'
    AND spr.status = 'processed' AND p2.is_active = true
    AND spr.raw_data->>'Catalogs' ILIKE '%Our Nature%'
) p
WHERE c.name = 'Our Nature' AND c.is_deleted = false
ON CONFLICT (collection_id, product_id) DO NOTHING;

-- Novidades SPOT
INSERT INTO collection_products (collection_id, product_id, display_order, created_at)
SELECT DISTINCT c.id, p.id,
  ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY p.sku),
  now()
FROM collections c
CROSS JOIN (
  SELECT DISTINCT p2.id, p2.sku
  FROM supplier_products_raw spr
  JOIN products p2 ON p2.sku = spr.raw_data->>'ProdReference'
    AND p2.supplier_id = spr.supplier_id
  WHERE spr.supplier_id = 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'
    AND spr.status = 'processed' AND p2.is_active = true
    AND spr.raw_data->>'Catalogs' ILIKE '%Novidades%'
) p
WHERE c.name = 'Novidades SPOT' AND c.is_deleted = false
ON CONFLICT (collection_id, product_id) DO NOTHING;

-- Time Vai Brasil 2026
INSERT INTO collection_products (collection_id, product_id, display_order, created_at)
SELECT DISTINCT c.id, p.id,
  ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY p.sku),
  now()
FROM collections c
CROSS JOIN (
  SELECT DISTINCT p2.id, p2.sku
  FROM supplier_products_raw spr
  JOIN products p2 ON p2.sku = spr.raw_data->>'ProdReference'
    AND p2.supplier_id = spr.supplier_id
  WHERE spr.supplier_id = 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'
    AND spr.status = 'processed' AND p2.is_active = true
    AND spr.raw_data->>'Catalogs' ILIKE '%TimeVaiBrasil2026%'
) p
WHERE c.name = 'Time Vai Brasil 2026' AND c.is_deleted = false
ON CONFLICT (collection_id, product_id) DO NOTHING;

-- Últimas Chegadas
INSERT INTO collection_products (collection_id, product_id, display_order, created_at)
SELECT DISTINCT c.id, p.id,
  ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY p.sku),
  now()
FROM collections c
CROSS JOIN (
  SELECT DISTINCT p2.id, p2.sku
  FROM supplier_products_raw spr
  JOIN products p2 ON p2.sku = spr.raw_data->>'ProdReference'
    AND p2.supplier_id = spr.supplier_id
  WHERE spr.supplier_id = 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'
    AND spr.status = 'processed' AND p2.is_active = true
    AND spr.raw_data->>'Catalogs' ILIKE '%Últimas Chegadas%'
) p
WHERE c.name = 'Últimas Chegadas' AND c.is_deleted = false
ON CONFLICT (collection_id, product_id) DO NOTHING;
;
