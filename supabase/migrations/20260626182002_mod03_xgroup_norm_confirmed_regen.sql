-- 21 cross-grupo onde o NOME confirma o normalizado (e não o jsonb) => normalizado correto, jsonb stale.
-- Regen jsonb a partir do normalizado. bulk_import_mode suprime cascata.
SELECT set_config('app.bulk_import_mode','true', true);

WITH d AS (
  SELECT p.id, extensions.unaccent(lower(p.name)) AS lname, p.materials,
    (SELECT array_agg(DISTINCT mt.group_id) FROM (SELECT public.fn_find_material_type_id(e) AS tid FROM jsonb_array_elements_text(p.materials) j(e)) s JOIN material_types mt ON mt.id=s.tid) AS jgroups,
    (SELECT array_agg(DISTINCT mt.group_id) FROM product_materials pm JOIN material_types mt ON mt.id=pm.material_id WHERE pm.product_id=p.id AND pm.is_active) AS ngroups,
    (SELECT array_agg(DISTINCT s.tid) FROM (SELECT public.fn_find_material_type_id(e) AS tid FROM jsonb_array_elements_text(p.materials) j(e)) s WHERE s.tid IS NOT NULL) AS jids,
    (SELECT array_agg(DISTINCT pm.material_id) FROM product_materials pm WHERE pm.product_id=p.id AND pm.is_active) AS nids
  FROM products p WHERE p.is_active
),
c462 AS (
  SELECT * FROM d WHERE jids IS NOT NULL AND nids IS NOT NULL AND NOT (jids @> nids AND nids @> jids) AND NOT (ngroups @> jgroups)
),
corr AS (
  SELECT t.id,
    (SELECT bool_or(t.lname LIKE '%'||left(extensions.unaccent(lower(w)),5)||'%') FROM jsonb_array_elements_text(t.materials) j(e), unnest(string_to_array(e,' ')) w WHERE length(w)>=5) AS jcorr,
    (SELECT bool_or(t.lname LIKE '%'||left(extensions.unaccent(lower(w)),5)||'%') FROM product_materials pm JOIN material_types mt ON mt.id=pm.material_id, unnest(string_to_array(mt.name,' ')) w WHERE pm.product_id=t.id AND pm.is_active AND length(w)>=5 AND w NOT ILIKE 'gen%rico') AS ncorr
  FROM c462 t
),
tgt AS (SELECT id FROM corr WHERE ncorr AND NOT jcorr)
UPDATE products p SET
  materials = COALESCE((SELECT jsonb_agg(mt.name ORDER BY pm.sort_order, mt.name)
                        FROM product_materials pm JOIN material_types mt ON mt.id=pm.material_id
                        WHERE pm.product_id=p.id AND pm.is_active),'[]'::jsonb),
  auto_material = (SELECT mt.name FROM product_materials pm JOIN material_types mt ON mt.id=pm.material_id
                   WHERE pm.product_id=p.id AND pm.is_active
                   ORDER BY pm.percentage DESC NULLS LAST, pm.sort_order ASC LIMIT 1),
  updated_at = now()
WHERE p.id IN (SELECT id FROM tgt);;
