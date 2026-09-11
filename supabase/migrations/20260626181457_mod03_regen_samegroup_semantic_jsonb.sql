-- 368 produtos onde jsonb e normalizado divergem mas TODOS os grupos do jsonb ⊆ grupos do normalizado
-- (mesma família => normalizado é o refinamento/fonte de verdade). Regenera o cache jsonb a partir do normalizado.
-- bulk_import_mode suprime cascata reversa. Cross-grupo (462) NÃO é tocado.
SELECT set_config('app.bulk_import_mode','true', true);

WITH d AS (
  SELECT p.id,
    (SELECT array_agg(DISTINCT mt.group_id) FROM (SELECT public.fn_find_material_type_id(e) AS tid FROM jsonb_array_elements_text(p.materials) j(e)) s JOIN material_types mt ON mt.id=s.tid) AS jgroups,
    (SELECT array_agg(DISTINCT mt.group_id) FROM product_materials pm JOIN material_types mt ON mt.id=pm.material_id WHERE pm.product_id=p.id AND pm.is_active) AS ngroups,
    (SELECT array_agg(DISTINCT s.tid) FROM (SELECT public.fn_find_material_type_id(e) AS tid FROM jsonb_array_elements_text(p.materials) j(e)) s WHERE s.tid IS NOT NULL) AS jids,
    (SELECT array_agg(DISTINCT pm.material_id) FROM product_materials pm WHERE pm.product_id=p.id AND pm.is_active) AS nids
  FROM products p WHERE p.is_active
),
tgt AS (
  SELECT id FROM d
  WHERE jids IS NOT NULL AND nids IS NOT NULL AND NOT (jids @> nids AND nids @> jids) AND ngroups @> jgroups
)
UPDATE products p SET
  materials = COALESCE((SELECT jsonb_agg(mt.name ORDER BY pm.sort_order, mt.name)
                        FROM product_materials pm JOIN material_types mt ON mt.id=pm.material_id
                        WHERE pm.product_id=p.id AND pm.is_active),'[]'::jsonb),
  auto_material = (SELECT mt.name FROM product_materials pm JOIN material_types mt ON mt.id=pm.material_id
                   WHERE pm.product_id=p.id AND pm.is_active
                   ORDER BY pm.percentage DESC NULLS LAST, pm.sort_order ASC LIMIT 1),
  updated_at = now()
WHERE p.id IN (SELECT id FROM tgt);;
