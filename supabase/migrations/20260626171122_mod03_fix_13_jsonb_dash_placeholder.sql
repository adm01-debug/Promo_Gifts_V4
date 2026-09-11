-- 13 produtos com jsonb lixo ["-"]; normalizado tem o material real.
-- Regenera jsonb a partir do normalizado (replica fn_sync). bulk_import_mode suprime cascata reversa.
SELECT set_config('app.bulk_import_mode','true', true);

UPDATE products p SET
  materials = COALESCE((SELECT jsonb_agg(mt.name ORDER BY pm.sort_order, mt.name)
                        FROM product_materials pm JOIN material_types mt ON mt.id=pm.material_id
                        WHERE pm.product_id=p.id AND pm.is_active), '[]'::jsonb),
  auto_material = (SELECT mt.name FROM product_materials pm JOIN material_types mt ON mt.id=pm.material_id
                   WHERE pm.product_id=p.id AND pm.is_active
                   ORDER BY pm.percentage DESC NULLS LAST, pm.sort_order ASC LIMIT 1),
  updated_at = now()
WHERE p.materials::text = '["-"]';;
