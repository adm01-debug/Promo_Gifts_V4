-- 170 cross-grupo onde o NOME confirma o jsonb e NENHUM material normalizado => normalizado ERRADO.
-- REPLACE: captura tipos do jsonb ANTES (evita armadilha cascata), desativa pm errados, insere os corretos.
-- jsonb-confirmado pelo nome = alta confiança. Reversível (is_active). fn_sync regenera o jsonb.
DO $$
BEGIN
  PERFORM set_config('app.bulk_import_mode','true', true);

  CREATE TEMP TABLE _fix ON COMMIT DROP AS
  WITH d AS (
    SELECT p.id, extensions.unaccent(lower(p.name)) AS lname, p.materials,
      (SELECT array_agg(DISTINCT mt.group_id) FROM (SELECT public.fn_find_material_type_id(e) AS tid FROM jsonb_array_elements_text(p.materials) j(e)) s JOIN material_types mt ON mt.id=s.tid) AS jgroups,
      (SELECT array_agg(DISTINCT mt.group_id) FROM product_materials pm JOIN material_types mt ON mt.id=pm.material_id WHERE pm.product_id=p.id AND pm.is_active) AS ngroups,
      (SELECT array_agg(DISTINCT s.tid) FROM (SELECT public.fn_find_material_type_id(e) AS tid FROM jsonb_array_elements_text(p.materials) j(e)) s WHERE s.tid IS NOT NULL) AS jids,
      (SELECT array_agg(DISTINCT pm.material_id) FROM product_materials pm WHERE pm.product_id=p.id AND pm.is_active) AS nids
    FROM products p WHERE p.is_active
  ),
  c462 AS (SELECT * FROM d WHERE jids IS NOT NULL AND nids IS NOT NULL AND NOT (jids @> nids AND nids @> jids) AND NOT (ngroups @> jgroups)),
  corr AS (
    SELECT t.id,
      (SELECT bool_or(t.lname LIKE '%'||left(extensions.unaccent(lower(w)),5)||'%') FROM jsonb_array_elements_text(t.materials) j(e), unnest(string_to_array(e,' ')) w WHERE length(w)>=5) AS jcorr,
      (SELECT bool_or(t.lname LIKE '%'||left(extensions.unaccent(lower(w)),5)||'%') FROM product_materials pm JOIN material_types mt ON mt.id=pm.material_id, unnest(string_to_array(mt.name,' ')) w WHERE pm.product_id=t.id AND pm.is_active AND length(w)>=5 AND w NOT ILIKE 'gen%rico') AS ncorr
    FROM c462 t
  ),
  tgt AS (SELECT id FROM corr WHERE jcorr AND NOT ncorr)
  SELECT t.id AS product_id, s.tid AS material_id,
    (SELECT pm.organization_id FROM product_materials pm WHERE pm.product_id=t.id LIMIT 1) AS org
  FROM tgt t JOIN products p ON p.id=t.id
  CROSS JOIN LATERAL (SELECT DISTINCT public.fn_find_material_type_id(e) AS tid FROM jsonb_array_elements_text(p.materials) j(e)) s
  WHERE s.tid IS NOT NULL;

  UPDATE product_materials SET is_active=false, updated_at=now()
  WHERE product_id IN (SELECT DISTINCT product_id FROM _fix) AND is_active;

  INSERT INTO product_materials (organization_id, product_id, material_id, part, percentage, is_active, sort_order)
  SELECT org, product_id, material_id, 'corpo', NULL, true, 100 FROM _fix
  ON CONFLICT (product_id, material_id) DO UPDATE SET is_active=true, updated_at=now();
END $$;;
