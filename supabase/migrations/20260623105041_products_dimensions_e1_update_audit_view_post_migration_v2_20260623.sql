
-- Drop e recria (coluna order mudou)
DROP VIEW IF EXISTS public.v_products_dimensions_audit;

CREATE VIEW public.v_products_dimensions_audit AS
SELECT
  p.id AS product_id,
  p.sku,
  p.name,
  s.name AS supplier_name,
  p.is_active,
  p.dimensions_source,
  p.length_cm   AS esc_length,
  p.width_cm    AS esc_width,
  p.height_cm   AS esc_height,
  p.diameter_cm AS esc_diameter,
  p.shape_type  AS esc_shape_type,
  (p.dimensions->>'length_cm')::numeric   AS dim_length,
  (p.dimensions->>'width_cm')::numeric    AS dim_width,
  (p.dimensions->>'height_cm')::numeric   AS dim_height,
  (p.dimensions->>'diameter_cm')::numeric AS dim_diameter,
  p.dimensions->>'shape_type'             AS dim_shape_type,
  ROUND(ABS(COALESCE(p.length_cm, 0) - COALESCE((p.dimensions->>'length_cm')::numeric, 0))::numeric, 2) AS length_delta,
  ROUND(ABS(COALESCE(p.width_cm, 0)  - COALESCE((p.dimensions->>'width_cm')::numeric, 0))::numeric, 2) AS width_delta,
  ROUND(ABS(COALESCE(p.height_cm, 0) - COALESCE((p.dimensions->>'height_cm')::numeric, 0))::numeric, 2) AS height_delta,
  ABS(COALESCE(p.length_cm, 0) - COALESCE((p.dimensions->>'length_cm')::numeric, 0)) > 0.1 AS length_diverge,
  ABS(COALESCE(p.width_cm, 0)  - COALESCE((p.dimensions->>'width_cm')::numeric, 0)) > 0.1 AS width_diverge,
  ABS(COALESCE(p.height_cm, 0) - COALESCE((p.dimensions->>'height_cm')::numeric, 0)) > 0.1 AS height_diverge
FROM products p
LEFT JOIN suppliers s ON s.id = p.supplier_id
WHERE p.dimensions IS NOT NULL
  AND (
    ABS(COALESCE(p.length_cm, 0) - COALESCE((p.dimensions->>'length_cm')::numeric, 0)) > 0.1
    OR ABS(COALESCE(p.width_cm, 0) - COALESCE((p.dimensions->>'width_cm')::numeric, 0)) > 0.1
    OR ABS(COALESCE(p.height_cm, 0) - COALESCE((p.dimensions->>'height_cm')::numeric, 0)) > 0.1
  )
ORDER BY
  (ABS(COALESCE(p.length_cm, 0) - COALESCE((p.dimensions->>'length_cm')::numeric, 0)) > 0.1)::int +
  (ABS(COALESCE(p.width_cm, 0) - COALESCE((p.dimensions->>'width_cm')::numeric, 0)) > 0.1)::int +
  (ABS(COALESCE(p.height_cm, 0) - COALESCE((p.dimensions->>'height_cm')::numeric, 0)) > 0.1)::int DESC,
  p.is_active DESC;

COMMENT ON VIEW public.v_products_dimensions_audit IS
'Divergencias de VALOR entre dimensions jsonb e escalares.
unit_detected migrado para dimensions_source (E1 2026-06-23): nao mais listado como divergencia.
Escalar = fonte de verdade desde backfill B1.
Para dropar dimensions: resolver estas divergencias + verificar v_products_public.';
;
