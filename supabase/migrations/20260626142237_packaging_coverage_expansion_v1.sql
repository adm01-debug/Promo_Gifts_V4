-- ════════════════════════════════════════════════════════════════════
-- MELHORIA 5: expandir cobertura — descobre compat p/ produtos elegiveis
-- sem compat (perfil inferido por produto). Apenas 200/4849 cabem nas 14
-- caixas atuais; os 4649 restantes sao MAIORES que o catalogo (limitacao
-- fisica de catalogo, nao do sistema).
-- fix_version=2026-06-26_coverage_v1
-- ════════════════════════════════════════════════════════════════════
WITH prods AS (
  SELECT p.id, p.height_cm h, p.width_cm w, p.length_cm l, p.diameter_cm d, p.shape_type, p.supplier_id, fn_infer_packaging_config_type(p.id) perfil
  FROM products p WHERE p.is_active AND p.product_type IN ('product','kit') AND p.height_cm IS NOT NULL AND p.width_cm IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM product_packaging_compatibility c WHERE c.product_id=p.id AND c.active)),
pkgs AS (SELECT id, internal_height_cm ih, internal_width_cm iw, internal_length_cm il, supplier_id FROM products WHERE product_type='packaging' AND is_active AND internal_height_cm IS NOT NULL),
pairs AS (
  SELECT pr.id AS product_id, pr.perfil, pr.supplier_id prod_sup, pk.id AS packaging_id, pk.supplier_id pkg_sup, pr.shape_type,
    CASE WHEN pr.shape_type='cylindrical' THEN (GREATEST(pk.ih,pk.iw,pk.il)-pr.h)*10 ELSE (pk.ih-pr.h)*10 END AS gh,
    CASE WHEN pr.shape_type='cylindrical' THEN NULL ELSE (pk.iw-pr.w)*10 END AS gw,
    CASE WHEN pr.shape_type='cylindrical' THEN NULL ELSE (pk.il-pr.l)*10 END AS gl,
    CASE WHEN pr.shape_type='cylindrical' THEN (LEAST(pk.ih,pk.iw,pk.il)-COALESCE(pr.d,pr.w))*10 ELSE NULL END AS gd
  FROM prods pr CROSS JOIN pkgs pk),
classified AS (
  SELECT *, CASE WHEN shape_type='cylindrical' THEN LEAST(COALESCE(gh,999),COALESCE(gd,999)) ELSE LEAST(COALESCE(gh,999),COALESCE(gw,999),COALESCE(gl,999)) END AS gmin,
           CASE WHEN shape_type='cylindrical' THEN (COALESCE(gh,0)+COALESCE(gd,0))/2.0 ELSE (COALESCE(gh,0)+COALESCE(gw,0)+COALESCE(gl,0))/3.0 END AS gavg
  FROM pairs),
rated AS (
  SELECT *, CASE WHEN gmin<0 OR gmin < (CASE perfil WHEN 'bottles' THEN 3 WHEN 'fragile' THEN 5 WHEN 'precision' THEN 1 ELSE 2 END) THEN 'too_tight'
                 WHEN gmin <= (CASE perfil WHEN 'bottles' THEN 8 WHEN 'fragile' THEN 10 WHEN 'precision' THEN 3 ELSE 5 END) THEN 'tight'
                 WHEN gmin <= (CASE perfil WHEN 'bottles' THEN 20 WHEN 'fragile' THEN 20 WHEN 'precision' THEN 8 ELSE 15 END) THEN 'good'
                 WHEN gmin <= 50 THEN 'loose' ELSE 'too_large' END AS rating
  FROM classified)
INSERT INTO product_packaging_compatibility (product_id, packaging_id, compatibility_source, fit_rating,
  fit_gap_height_mm, fit_gap_width_mm, fit_gap_length_mm, fit_gap_diameter_mm, fit_gap_min_mm, fit_gap_avg_mm,
  is_same_supplier, auto_discovered_at, config_type_used, active)
SELECT product_id, packaging_id, 'dimension_calculated', rating,
  ROUND(COALESCE(gh,0)::numeric,2), ROUND(COALESCE(gw,0)::numeric,2), ROUND(COALESCE(gl,0)::numeric,2), ROUND(COALESCE(gd,0)::numeric,2),
  ROUND(gmin::numeric,2), ROUND(gavg::numeric,2), (prod_sup=pkg_sup), now(), perfil, true
FROM rated WHERE rating IN ('tight','good','loose')
ON CONFLICT (product_id, packaging_id) DO NOTHING;

-- Ranking p/ os produtos recem-descobertos (sem is_recommended ainda)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY
      CASE compatibility_source WHEN 'supplier_indicated' THEN 1 WHEN 'dimension_matching' THEN 2 WHEN 'dimension_calculated' THEN 3 ELSE 4 END,
      CASE fit_rating WHEN 'tight' THEN 1 WHEN 'good' THEN 2 WHEN 'loose' THEN 3 ELSE 4 END, COALESCE(fit_gap_min_mm,99999)) rn
  FROM product_packaging_compatibility WHERE active=true AND fit_rating IN ('tight','good','loose')
    AND product_id IN (SELECT product_id FROM product_packaging_compatibility WHERE active GROUP BY product_id HAVING bool_or(is_recommended)=false))
UPDATE product_packaging_compatibility ppc SET is_recommended=true, updated_at=now()
FROM ranked r WHERE ppc.id=r.id AND r.rn=1;

NOTIFY pgrst, 'reload schema';;
