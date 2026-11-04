-- 1. Criar color_variation "Fumê" no grupo Cinza
INSERT INTO color_variations (organization_id, group_id, color_group_id, internal_code, name, slug, hex_code, is_active)
VALUES (
  '5db5aee1-064b-4ef4-9193-345dcd8274ea',
  '11a77781-39a8-48d9-bfa6-c0e3c08391e9',  -- Cinza group_id
  '11a77781-39a8-48d9-bfa6-c0e3c08391e9',  -- Cinza color_group_id
  '11.5',
  'Fumê',
  'fume',
  '#877B7B',
  true
);

-- 2. Criar supplier_color PINK
INSERT INTO supplier_colors (organization_id, supplier_id, code, name, hex_code, api_color_id, source, is_active)
VALUES (
  '5db5aee1-064b-4ef4-9193-345dcd8274ea',
  'd6718a29-e954-4c1b-bd84-03ea24884900',
  'PNK', 'PINK', '#DC0256', '104', 'xbz_site', true
);

-- 3. Criar supplier_color VERDE ESCURO
INSERT INTO supplier_colors (organization_id, supplier_id, code, name, hex_code, api_color_id, source, is_active)
VALUES (
  '5db5aee1-064b-4ef4-9193-345dcd8274ea',
  'd6718a29-e954-4c1b-bd84-03ea24884900',
  'VDE', 'VERDE ESCURO', '#016934', '20', 'xbz_site', true
);

-- 4. Criar supplier_color FUMÊ
INSERT INTO supplier_colors (organization_id, supplier_id, code, name, hex_code, api_color_id, source, is_active)
VALUES (
  '5db5aee1-064b-4ef4-9193-345dcd8274ea',
  'd6718a29-e954-4c1b-bd84-03ea24884900',
  'FUM', 'FUME', '#877B7B', '12', 'xbz_site', true
);
