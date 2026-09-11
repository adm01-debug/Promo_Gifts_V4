-- 45 cross-grupo onde o NOME cita ambos materiais (jsonb E normalizado) => produto multi-material.
-- União NÃO-destrutiva: adiciona ao normalizado os tipos resolvidos do jsonb que faltam (percentage=NULL).
-- fn_sync regenera o jsonb = união. organization_id derivado das linhas pm existentes do produto.
SELECT set_config('app.bulk_import_mode','true', true);

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
tgt AS (SELECT id FROM corr WHERE jcorr AND ncorr),
to_add AS (
  SELECT t.id AS product_id, s.tid AS material_id,
    (SELECT pm.organization_id FROM product_materials pm WHERE pm.product_id=t.id LIMIT 1) AS org
  FROM tgt t JOIN products p ON p.id=t.id
  CROSS JOIN LATERAL (SELECT DISTINCT public.fn_find_material_type_id(e) AS tid FROM jsonb_array_elements_text(p.materials) j(e)) s
  WHERE s.tid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM product_materials pm2 WHERE pm2.product_id=t.id AND pm2.material_id=s.tid AND pm2.is_active)
)
INSERT INTO product_materials (organization_id, product_id, material_id, part, percentage, is_active, sort_order)
SELECT org, product_id, material_id, 'corpo', NULL, true, 200 FROM to_add
ON CONFLICT (product_id, material_id) DO UPDATE SET is_active=true, updated_at=now();;
