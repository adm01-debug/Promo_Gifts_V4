-- 158 cross-grupo onde nome+descrição confirmam o material do jsonb (multi-material).
-- União NÃO-destrutiva: adiciona ao normalizado os tipos do jsonb que faltam, com part=NULL/percentage=NULL
-- (não viola validate_material_percentages: NULL contribui 0 e cada parte já soma <=100). fn_sync regenera o jsonb.
-- Exclui (por construção) qualquer caso jsonb-confirmado-por-NOME que exigiria replace (b_replace_nome=0).
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
    (SELECT bool_or(t.lname LIKE '%'||left(extensions.unaccent(lower(w)),5)||'%') FROM jsonb_array_elements_text(t.materials) j(e), unnest(string_to_array(e,' ')) w WHERE length(w)>=5) AS jcorr_name,
    (SELECT bool_or(t.ltext LIKE '%'||left(extensions.unaccent(lower(w)),5)||'%') FROM jsonb_array_elements_text(t.materials) j(e), unnest(string_to_array(e,' ')) w WHERE length(w)>=5) AS jcorr_text,
    (SELECT bool_or(t.ltext LIKE '%'||left(extensions.unaccent(lower(w)),5)||'%') FROM product_materials pm JOIN material_types mt ON mt.id=pm.material_id, unnest(string_to_array(mt.name,' ')) w WHERE pm.product_id=t.id AND pm.is_active AND length(w)>=5 AND w NOT ILIKE 'gen%rico') AS ncorr_text
  FROM div t
),
tgt AS (SELECT id FROM corr WHERE jcorr_text AND NOT (jcorr_name AND NOT ncorr_text)),
to_add AS (
  SELECT t.id AS product_id, s.tid AS material_id,
    (SELECT pm.organization_id FROM product_materials pm WHERE pm.product_id=t.id LIMIT 1) AS org
  FROM tgt t JOIN products p ON p.id=t.id
  CROSS JOIN LATERAL (SELECT DISTINCT public.fn_find_material_type_id(e) AS tid FROM jsonb_array_elements_text(p.materials) j(e)) s
  WHERE s.tid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM product_materials pm2 WHERE pm2.product_id=t.id AND pm2.material_id=s.tid AND pm2.is_active)
)
INSERT INTO product_materials (organization_id, product_id, material_id, part, percentage, is_active, sort_order)
SELECT org, product_id, material_id, NULL, NULL, true, 200 FROM to_add
ON CONFLICT (product_id, material_id) DO UPDATE SET is_active=true, percentage=NULL, updated_at=now();;
