
INSERT INTO variation_types (
  code, name, slug, organization_id,
  description, value_type, is_required, is_active, sort_order
)
VALUES (
  'COR',
  'Cor',
  'cor',
  '5db5aee1-064b-4ef4-9193-345dcd8274ea',
  'Variação de cor do produto — chave canônica entre fornecedores',
  'predefined',
  false,
  true,
  1
)
ON CONFLICT (organization_id, code) DO UPDATE
  SET name = EXCLUDED.name,
      is_active = true,
      updated_at = now();
;
