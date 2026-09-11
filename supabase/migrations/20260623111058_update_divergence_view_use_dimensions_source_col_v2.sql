
-- DROP e recria view com coluna dimensions_source no lugar correto
DROP VIEW IF EXISTS public.v_dimensions_source_divergence;

CREATE VIEW public.v_dimensions_source_divergence AS
SELECT
  p.id,
  p.sku,
  p.supplier_id,
  s.name AS supplier_name,
  p.dimensions_source,
  p.length_cm   AS scalar_length_cm,
  p.width_cm    AS scalar_width_cm,
  p.height_cm   AS scalar_height_cm,
  (p.dimensions->>'length_cm')::numeric AS jsonb_length_cm,
  (p.dimensions->>'width_cm')::numeric  AS jsonb_width_cm,
  (p.dimensions->>'height_cm')::numeric AS jsonb_height_cm,
  ABS(p.length_cm - (p.dimensions->>'length_cm')::numeric) AS length_diff_cm,
  ABS(p.width_cm  - (p.dimensions->>'width_cm')::numeric)  AS width_diff_cm,
  ABS(p.height_cm - (p.dimensions->>'height_cm')::numeric) AS height_diff_cm,
  CASE
    WHEN ABS(p.length_cm - (p.dimensions->>'length_cm')::numeric) > 50 THEN 'critical'
    WHEN ABS(p.length_cm - (p.dimensions->>'length_cm')::numeric) > 10 THEN 'high'
    WHEN ABS(p.length_cm - (p.dimensions->>'length_cm')::numeric) > 2  THEN 'medium'
    ELSE 'low'
  END AS severity
FROM public.products p
JOIN public.suppliers s ON s.id = p.supplier_id
WHERE p.is_active = true
  AND p.dimensions IS NOT NULL
  AND p.dimensions_source = 'cm'
  AND p.length_cm IS NOT NULL
  AND (p.dimensions->>'length_cm') IS NOT NULL
  AND ABS(p.length_cm - (p.dimensions->>'length_cm')::numeric) > 0.01
ORDER BY length_diff_cm DESC;

GRANT SELECT ON public.v_dimensions_source_divergence TO authenticated;
;
