
-- Passo 10-B v2: Popular product_attributes com dados SPOT (LATERAL separado em subquery)

-- 1. SPOT Properties (tags booleanas de características)
INSERT INTO product_attributes (
  product_id, attribute_key, attribute_value, attribute_type,
  source_supplier, source_field, source_raw_value,
  is_visible, is_filterable, is_comparable, display_order, created_at, updated_at
)
SELECT DISTINCT
  p.id,
  lower(regexp_replace(regexp_replace(trim(tag_value),'[áàãâä]','a','g'),'[\s\-]+','_','g')) AS attribute_key,
  'true',
  'boolean',
  'SPOT', 'Properties', trim(tag_value),
  true, true, true,
  ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY tag_value),
  now(), now()
FROM products p
JOIN suppliers s ON p.supplier_id = s.id
JOIN LATERAL jsonb_array_elements_text(p.tags) AS tag_value ON true
WHERE s.name = 'Spot | Stricker'
  AND p.is_active = true
  AND p.tags IS NOT NULL
  AND jsonb_array_length(p.tags) > 0
  AND tag_value !~ '^\d'
  AND length(trim(tag_value)) > 3
ON CONFLICT (product_id, attribute_key) DO NOTHING;

-- 2. SPOT Certificates
INSERT INTO product_attributes (
  product_id, attribute_key, attribute_value, attribute_type,
  source_supplier, source_field, source_raw_value,
  is_visible, is_filterable, is_comparable, display_order, created_at, updated_at
)
SELECT DISTINCT
  p.id,
  lower(regexp_replace(regexp_replace(trim(cert),'[áàãâä]','a','g'),'[\s\-\/]+','_','g')),
  'true', 'boolean',
  'SPOT', 'Certificates', trim(cert),
  true, true, true,
  50, now(), now()
FROM supplier_products_raw spr
JOIN products p ON p.sku = spr.raw_data->>'ProdReference' AND p.supplier_id = spr.supplier_id
JOIN LATERAL (
  SELECT trim(unnest(string_to_array(spr.raw_data->>'Certificates', ','))) AS cert
) certs ON true
WHERE spr.supplier_id = 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'
  AND spr.status = 'processed'
  AND p.is_active = true
  AND spr.raw_data->>'Certificates' IS NOT NULL
  AND spr.raw_data->>'Certificates' != ''
  AND length(trim(cert)) > 1
ON CONFLICT (product_id, attribute_key) DO NOTHING;

-- 3. SPOT Materials → material_principal
INSERT INTO product_attributes (
  product_id, attribute_key, attribute_value, attribute_type,
  source_supplier, source_field, source_raw_value,
  is_visible, is_filterable, is_comparable, display_order, created_at, updated_at
)
SELECT DISTINCT
  p.id, 'material_principal',
  spr.raw_data->>'Materials', 'text',
  'SPOT', 'Materials', spr.raw_data->>'Materials',
  true, true, true, 5, now(), now()
FROM supplier_products_raw spr
JOIN products p ON p.sku = spr.raw_data->>'ProdReference' AND p.supplier_id = spr.supplier_id
WHERE spr.supplier_id = 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'
  AND spr.status = 'processed' AND p.is_active = true
  AND spr.raw_data->>'Materials' IS NOT NULL AND spr.raw_data->>'Materials' != ''
ON CONFLICT (product_id, attribute_key) DO NOTHING;

-- 4. SPOT CombinedSizes → dimensoes
INSERT INTO product_attributes (
  product_id, attribute_key, attribute_value, attribute_type,
  source_supplier, source_field, source_raw_value,
  is_visible, is_filterable, is_comparable, display_order, created_at, updated_at
)
SELECT DISTINCT
  p.id, 'dimensoes',
  spr.raw_data->>'CombinedSizes', 'text',
  'SPOT', 'CombinedSizes', spr.raw_data->>'CombinedSizes',
  true, false, true, 10, now(), now()
FROM supplier_products_raw spr
JOIN products p ON p.sku = spr.raw_data->>'ProdReference' AND p.supplier_id = spr.supplier_id
WHERE spr.supplier_id = 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'
  AND spr.status = 'processed' AND p.is_active = true
  AND spr.raw_data->>'CombinedSizes' IS NOT NULL
  AND spr.raw_data->>'CombinedSizes' NOT IN ('','0')
ON CONFLICT (product_id, attribute_key) DO NOTHING;

-- 5. XBZ: popular atributos via products.tags (flat array de keywords)
INSERT INTO product_attributes (
  product_id, attribute_key, attribute_value, attribute_type,
  source_supplier, source_field, source_raw_value,
  is_visible, is_filterable, is_comparable, display_order, created_at, updated_at
)
SELECT DISTINCT
  p.id,
  lower(regexp_replace(regexp_replace(trim(tag_value),'[áàãâä]','a','g'),'[\s\-]+','_','g')),
  'true', 'boolean',
  'XBZ', 'tags', trim(tag_value),
  true, false, false,   -- XBZ tags são menos estruturadas: visible mas não filtráveis ainda
  ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY tag_value),
  now(), now()
FROM products p
JOIN suppliers s ON p.supplier_id = s.id
JOIN LATERAL jsonb_array_elements_text(p.tags) AS tag_value ON true
WHERE s.name = 'XBZ Brindes'
  AND p.is_active = true
  AND p.tags IS NOT NULL
  AND jsonb_array_length(p.tags) > 0
  AND tag_value !~ '^\d'
  AND length(trim(tag_value)) > 3
  AND trim(tag_value) NOT ILIKE '%D%'  -- excluir '300D', '600D', etc.
ON CONFLICT (product_id, attribute_key) DO NOTHING;

-- 6. Asia Import: popular atributos via products.tags
INSERT INTO product_attributes (
  product_id, attribute_key, attribute_value, attribute_type,
  source_supplier, source_field, source_raw_value,
  is_visible, is_filterable, is_comparable, display_order, created_at, updated_at
)
SELECT DISTINCT
  p.id,
  lower(regexp_replace(regexp_replace(trim(tag_value),'[áàãâäéèêëíìîïóòõôöúùûüç]','x','g'),'[\s\-]+','_','g')),
  'true', 'boolean',
  'ASIA', 'tags', trim(tag_value),
  true, false, false,
  ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY tag_value),
  now(), now()
FROM products p
JOIN suppliers s ON p.supplier_id = s.id
JOIN LATERAL jsonb_array_elements_text(p.tags) AS tag_value ON true
WHERE s.name = 'Asia Import'
  AND p.is_active = true
  AND p.tags IS NOT NULL
  AND jsonb_array_length(p.tags) > 0
  AND tag_value !~ '^\d'
  AND length(trim(tag_value)) > 3
  AND trim(tag_value) NOT ILIKE '%ml%'
  AND trim(tag_value) NOT ILIKE 'Ignorar%'
ON CONFLICT (product_id, attribute_key) DO NOTHING;
;
