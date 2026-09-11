-- MELHORIA 2 (fix ranking): NULL-safe — rankeia somente compat compativel,
-- evitando que registros manual com fit_rating NULL bloqueiem a eleicao.
-- fix_version=2026-06-26_perfis_v1
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY
      CASE compatibility_source WHEN 'supplier_indicated' THEN 1 WHEN 'dimension_matching' THEN 2 WHEN 'dimension_calculated' THEN 3 ELSE 4 END,
      CASE fit_rating WHEN 'tight' THEN 1 WHEN 'good' THEN 2 WHEN 'loose' THEN 3 ELSE 4 END,
      COALESCE(fit_gap_min_mm,99999)) rn
  FROM product_packaging_compatibility WHERE active=true AND fit_rating IN ('tight','good','loose'))
UPDATE product_packaging_compatibility ppc SET is_recommended = COALESCE(r.rn=1,false)
FROM ranked r WHERE r.id=ppc.id AND ppc.is_recommended IS DISTINCT FROM COALESCE(r.rn=1,false);

UPDATE product_packaging_compatibility SET is_recommended=false
WHERE active AND is_recommended AND COALESCE(fit_rating,'x') NOT IN ('tight','good','loose');;
