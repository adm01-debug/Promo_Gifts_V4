-- 28 cross-grupo onde nome+descrição confirmam o NORMALIZADO (e não o jsonb) => jsonb stale. Regen do normalizado.
SELECT set_config('app.bulk_import_mode','true', true);
WITH d AS (
  SELECT p.id,
    extensions.unaccent(lower(COALESCE(p.name,'')||' '||COALESCE(p.description,'')||' '||COALESCE(p.short_description,''))) AS ltext,
    p.materials,
    (SELECT array_agg(e ORDER BY e) FROM jsonb_array_elements_text(p.materials) j(e)) AS jn,
    (SELECT array_agg(mt.name::text ORDER BY mt.name::text) FROM product_materials pm JOIN material_types mt ON mt.id=pm.material_id WHERE pm.product_id=p.id AND pm.is_active) AS nn
  FROM products p WHERE p.is_active
),
div AS (SELECT * FROM d WHERE jn IS DISTINCT FROM nn),
corr AS (
  SELECT t.id,
    (SELECT bool_or(t.ltext LIKE '%'||left(extensions.unaccent(lower(w)),5)||'%') FROM jsonb_array_elements_text(t.materials) j(e), unnest(string_to_array(e,' ')) w WHERE length(w)>=5) AS jcorr_text,
    (SELECT bool_or(t.ltext LIKE '%'||left(extensions.unaccent(lower(w)),5)||'%') FROM product_materials pm JOIN material_types mt ON mt.id=pm.material_id, unnest(string_to_array(mt.name,' ')) w WHERE pm.product_id=t.id AND pm.is_active AND length(w)>=5 AND w NOT ILIKE 'gen%rico') AS ncorr_text
  FROM div t
),
tgt AS (SELECT id FROM corr WHERE ncorr_text AND NOT jcorr_text)
UPDATE products p SET
  materials = COALESCE((SELECT jsonb_agg(mt.name ORDER BY pm.sort_order, mt.name) FROM product_materials pm JOIN material_types mt ON mt.id=pm.material_id WHERE pm.product_id=p.id AND pm.is_active),'[]'::jsonb),
  auto_material = (SELECT mt.name FROM product_materials pm JOIN material_types mt ON mt.id=pm.material_id WHERE pm.product_id=p.id AND pm.is_active ORDER BY pm.percentage DESC NULLS LAST, pm.sort_order ASC LIMIT 1),
  updated_at=now()
WHERE p.id IN (SELECT id FROM tgt);;
