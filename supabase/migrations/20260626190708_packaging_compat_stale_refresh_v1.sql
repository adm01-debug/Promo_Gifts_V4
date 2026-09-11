-- ════════════════════════════════════════════════════════════════════
-- REFRESH do estado STALE (achado em teste adversarial): 107 compat
-- desatualizadas por mudanca de dimensoes (87 diziam "cabe" sem caber,
-- 43 produtos recomendavam caixa que nao cabe). Recalcula via fit-funcao
-- (fonte de verdade) os candidatos detectados + re-elege recomendados +
-- ressincroniza a flag. A prevencao (trg_recalc_compat_on_dims) impede recorrencia.
-- fix_version=2026-06-26_compat_stale_refresh_v1
-- ════════════════════════════════════════════════════════════════════

-- (1) Refresh dos candidatos (gap recalculado das dims atuais difere do armazenado)
WITH cand AS (
  SELECT c.id FROM product_packaging_compatibility c JOIN products p ON p.id=c.product_id JOIN products pk ON pk.id=c.packaging_id
  WHERE c.active AND ROUND((CASE WHEN p.shape_type='cylindrical'
        THEN LEAST((GREATEST(pk.internal_height_cm,pk.internal_width_cm,pk.internal_length_cm)-p.height_cm)*10,(LEAST(pk.internal_height_cm,pk.internal_width_cm,pk.internal_length_cm)-COALESCE(p.diameter_cm,p.width_cm))*10)
        ELSE LEAST((pk.internal_height_cm-p.height_cm)*10,(pk.internal_width_cm-p.width_cm)*10,(pk.internal_length_cm-p.length_cm)*10) END)::numeric,0)
      IS DISTINCT FROM ROUND(c.fit_gap_min_mm,0)
),
recalc AS (SELECT c.id, fn_calculate_packaging_fit(c.product_id,c.packaging_id,c.config_type_used) AS fit
           FROM product_packaging_compatibility c WHERE c.id IN (SELECT id FROM cand))
UPDATE product_packaging_compatibility c
SET fit_rating=(r.fit->>'fit_rating'), fit_gap_min_mm=NULLIF(r.fit->>'gap_min_mm','')::numeric, fit_gap_avg_mm=NULLIF(r.fit->>'gap_avg_mm','')::numeric,
    fit_gap_height_mm=NULLIF(r.fit->>'gap_height_mm','')::numeric, fit_gap_width_mm=NULLIF(r.fit->>'gap_width_mm','')::numeric,
    fit_gap_length_mm=NULLIF(r.fit->>'gap_length_mm','')::numeric, fit_gap_diameter_mm=NULLIF(r.fit->>'gap_diameter_mm','')::numeric,
    needs_padding=COALESCE((r.fit->>'needs_padding')::boolean,false), updated_at=now()
FROM recalc r WHERE c.id=r.id;

-- (2) Re-eleger recomendados (NULL-safe) globalmente
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY
      CASE compatibility_source WHEN 'supplier_indicated' THEN 1 WHEN 'dimension_matching' THEN 2 WHEN 'dimension_calculated' THEN 3 ELSE 4 END,
      CASE fit_rating WHEN 'tight' THEN 1 WHEN 'good' THEN 2 WHEN 'loose' THEN 3 ELSE 4 END, COALESCE(fit_gap_min_mm,99999)) rn
  FROM product_packaging_compatibility WHERE active AND fit_rating IN ('tight','good','loose'))
UPDATE product_packaging_compatibility c SET is_recommended=COALESCE(r.rn=1,false)
FROM ranked r WHERE r.id=c.id AND c.is_recommended IS DISTINCT FROM COALESCE(r.rn=1,false);

UPDATE product_packaging_compatibility SET is_recommended=false
WHERE active AND is_recommended AND COALESCE(fit_rating,'x') NOT IN ('tight','good','loose');

-- (3) Ressincronizar flag has_optional_packaging
UPDATE products p SET has_optional_packaging = (
      COALESCE((p.description_packaging_info->>'has_optional_mention')::boolean,false)
      OR p.optional_packaging_ref IS NOT NULL OR p.packing_classification='protective'
      OR EXISTS (SELECT 1 FROM product_packaging_compatibility c WHERE c.product_id=p.id AND c.active AND c.fit_rating IN ('tight','good','loose')))
WHERE p.product_type IN ('product','kit') AND COALESCE(p.has_optional_packaging,false) IS DISTINCT FROM (
      COALESCE((p.description_packaging_info->>'has_optional_mention')::boolean,false)
      OR p.optional_packaging_ref IS NOT NULL OR p.packing_classification='protective'
      OR EXISTS (SELECT 1 FROM product_packaging_compatibility c WHERE c.product_id=p.id AND c.active AND c.fit_rating IN ('tight','good','loose')));

NOTIFY pgrst, 'reload schema';;
