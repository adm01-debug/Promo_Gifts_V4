-- 4 cross-grupo (matcher híbrido nome+desc, siglas curtas) onde o normalizado é confirmado e o jsonb não. Regen do normalizado.
SELECT set_config('app.bulk_import_mode','true', true);
WITH d AS (
  SELECT p.id,
    extensions.unaccent(lower(p.name)) AS lname,
    extensions.unaccent(lower(COALESCE(p.name,'')||' '||COALESCE(p.description,'')||' '||COALESCE(p.short_description,''))) AS ltext,
    p.materials,
    (SELECT array_agg(e ORDER BY e) FROM jsonb_array_elements_text(p.materials) j(e)) AS jn,
    (SELECT array_agg(mt.name::text ORDER BY mt.name::text) FROM product_materials pm JOIN material_types mt ON mt.id=pm.material_id WHERE pm.product_id=p.id AND pm.is_active) AS nn
  FROM products p WHERE p.is_active
),
div AS (SELECT * FROM d WHERE jn IS DISTINCT FROM nn),
corr AS (
  SELECT t.id,
    (SELECT bool_or(CASE WHEN length(tok)>=5 THEN t.lname LIKE '%'||left(tok,5)||'%' WHEN length(tok)>=2 THEN t.lname ~ ('\m'||tok||'\M') ELSE false END)
       FROM jsonb_array_elements_text(t.materials) j(e), LATERAL (SELECT regexp_replace(extensions.unaccent(lower(w)),'[^a-z0-9]','','g') AS tok FROM unnest(string_to_array(e,' ')) w) z) AS jcorr_text,
    (SELECT bool_or(CASE WHEN length(tok)>=5 THEN t.ltext LIKE '%'||left(tok,5)||'%' WHEN length(tok)>=2 THEN t.ltext ~ ('\m'||tok||'\M') ELSE false END)
       FROM product_materials pm JOIN material_types mt ON mt.id=pm.material_id, LATERAL (SELECT regexp_replace(extensions.unaccent(lower(w)),'[^a-z0-9]','','g') AS tok FROM unnest(string_to_array(mt.name,' ')) w) z
       WHERE pm.product_id=t.id AND pm.is_active AND tok NOT ILIKE 'gen%rico') AS ncorr_text
  FROM div t
),
tgt AS (SELECT id FROM corr WHERE ncorr_text AND NOT jcorr_text)
UPDATE products p SET
  materials = COALESCE((SELECT jsonb_agg(mt.name ORDER BY pm.sort_order, mt.name) FROM product_materials pm JOIN material_types mt ON mt.id=pm.material_id WHERE pm.product_id=p.id AND pm.is_active),'[]'::jsonb),
  auto_material = (SELECT mt.name FROM product_materials pm JOIN material_types mt ON mt.id=pm.material_id WHERE pm.product_id=p.id AND pm.is_active ORDER BY pm.percentage DESC NULLS LAST, pm.sort_order ASC LIMIT 1),
  updated_at=now()
WHERE p.id IN (SELECT id FROM tgt);;
