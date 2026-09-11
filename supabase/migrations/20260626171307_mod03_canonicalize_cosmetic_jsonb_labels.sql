-- Canoniza rótulos do cache jsonb p/ os nomes oficiais dos tipos (mesmo type_id => relabel puro).
-- Escopo: divergente em string E superset (nenhum tipo do jsonb fora do normalizado) => exclui os 831 semânticos.
-- bulk_import_mode suprime cascata reversa. auto_material já é canônico (não tocado).
SELECT set_config('app.bulk_import_mode','true', true);

UPDATE products p SET
  materials  = COALESCE((SELECT jsonb_agg(mt.name ORDER BY pm.sort_order, mt.name)
                         FROM product_materials pm JOIN material_types mt ON mt.id=pm.material_id
                         WHERE pm.product_id=p.id AND pm.is_active), '[]'::jsonb),
  updated_at = now()
WHERE p.is_active
  AND (SELECT array_agg(e ORDER BY e) FROM jsonb_array_elements_text(p.materials) AS j(e))
      IS DISTINCT FROM
      (SELECT array_agg(mt.name::text ORDER BY mt.name::text) FROM product_materials pm JOIN material_types mt ON mt.id=pm.material_id WHERE pm.product_id=p.id AND pm.is_active)
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(p.materials) AS j2(e2)
    WHERE public.fn_find_material_type_id(e2) IS NOT NULL
      AND public.fn_find_material_type_id(e2) NOT IN (
        SELECT pm.material_id FROM product_materials pm WHERE pm.product_id=p.id AND pm.is_active));;
