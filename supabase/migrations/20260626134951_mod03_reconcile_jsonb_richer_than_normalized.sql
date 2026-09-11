-- Reconciliacao Modulo 03: jsonb mais rico que normalizado (MV800P, BAC003P)
-- Reconstroi product_materials a partir do jsonb (fonte mais completa), distribuicao uniforme.
SELECT set_config('app.bulk_import_mode','true', true);

UPDATE product_materials
   SET is_active = false, updated_at = now()
 WHERE is_active = true
   AND product_id IN (SELECT id FROM products WHERE sku_promo IN ('MV800P','BAC003P'));

WITH tgt AS (
  SELECT id AS product_id, organization_id, materials
  FROM products WHERE sku_promo IN ('MV800P','BAC003P')
),
resolved AS (
  SELECT t.product_id, t.organization_id,
         public.fn_find_material_type_id(e.name) AS type_id,
         min(e.ord) AS ord
  FROM tgt t,
       LATERAL jsonb_array_elements_text(t.materials) WITH ORDINALITY AS e(name, ord)
  WHERE public.fn_find_material_type_id(e.name) IS NOT NULL
  GROUP BY t.product_id, t.organization_id, public.fn_find_material_type_id(e.name)
),
counted AS (
  SELECT r.*,
         count(*)     OVER (PARTITION BY product_id)            AS n,
         row_number() OVER (PARTITION BY product_id ORDER BY ord) AS rn
  FROM resolved r
)
INSERT INTO product_materials (organization_id, product_id, material_id, part, percentage, sort_order, notes, is_active)
SELECT organization_id, product_id, type_id, 'corpo',
       round(100.0 / n, 2), rn::int, 'reconc mod03 2026-06-26', true
FROM counted
ON CONFLICT (product_id, material_id) DO UPDATE SET
  is_active       = true,
  part            = 'corpo',
  percentage      = EXCLUDED.percentage,
  sort_order      = EXCLUDED.sort_order,
  notes           = EXCLUDED.notes,
  organization_id = EXCLUDED.organization_id,
  updated_at      = now();;
