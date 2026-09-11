-- Recuperacao MV800P/BAC003P (a migration anterior esvaziou via cascata fn_sync).
-- Dirigido por nomes capturados (NAO pelo jsonb, que ficou vazio). percentage=NULL (composicao desconhecida).
SELECT set_config('app.bulk_import_mode','true', true);

WITH spec(sku, mat_name) AS (
  VALUES
    ('MV800P','Metal'),('MV800P','Poliéster'),('MV800P','ABS'),('MV800P','Plástico'),
    ('BAC003P','Algodão'),('BAC003P','Cortiça')
),
res AS (
  SELECT p.id AS product_id, p.organization_id,
         public.fn_find_material_type_id(s.mat_name) AS type_id,
         row_number() OVER (PARTITION BY p.id ORDER BY s.mat_name) AS rn
  FROM spec s JOIN products p ON p.sku_promo = s.sku
  WHERE public.fn_find_material_type_id(s.mat_name) IS NOT NULL
)
INSERT INTO product_materials (organization_id, product_id, material_id, part, percentage, sort_order, notes, is_active)
SELECT organization_id, product_id, type_id, 'corpo', NULL, rn::int, 'reconc mod03 recovery 2026-06-26', true
FROM res
ON CONFLICT (product_id, material_id) DO UPDATE SET
  is_active       = true,
  part            = 'corpo',
  percentage      = NULL,
  sort_order      = EXCLUDED.sort_order,
  notes           = EXCLUDED.notes,
  organization_id = EXCLUDED.organization_id,
  updated_at      = now();;
