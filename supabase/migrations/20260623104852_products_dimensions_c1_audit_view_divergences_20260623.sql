
-- ══════════════════════════════════════════════════════════════════
-- Melhoria C: View de auditoria de divergências dimensions jsonb vs escalares
-- Monitoramento permanente da consistência entre o jsonb legado
-- e as colunas escalares que são a fonte de verdade.
-- ══════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.v_products_dimensions_audit AS
SELECT
  p.id AS product_id,
  p.sku,
  p.name,
  s.name AS supplier_name,
  -- Escalares (fonte de verdade após backfill)
  p.length_cm   AS esc_length,
  p.width_cm    AS esc_width,
  p.height_cm   AS esc_height,
  p.diameter_cm AS esc_diameter,
  p.shape_type  AS esc_shape_type,
  -- Jsonb
  (p.dimensions->>'length_cm')::numeric   AS dim_length,
  (p.dimensions->>'width_cm')::numeric    AS dim_width,
  (p.dimensions->>'height_cm')::numeric   AS dim_height,
  (p.dimensions->>'diameter_cm')::numeric AS dim_diameter,
  p.dimensions->>'shape_type'             AS dim_shape_type,
  p.dimensions->>'unit_detected'          AS unit_detected,
  -- Flags de divergência
  ABS(COALESCE(p.length_cm, 0) - COALESCE((p.dimensions->>'length_cm')::numeric, 0)) > 0.1 AS length_diverge,
  ABS(COALESCE(p.width_cm, 0)  - COALESCE((p.dimensions->>'width_cm')::numeric, 0))  > 0.1 AS width_diverge,
  ABS(COALESCE(p.height_cm, 0) - COALESCE((p.dimensions->>'height_cm')::numeric, 0)) > 0.1 AS height_diverge,
  -- Produto tem unit_detected (dado sem escalar equivalente)
  (p.dimensions->>'unit_detected') IS NOT NULL AS tem_unit_detected,
  p.is_active
FROM products p
LEFT JOIN suppliers s ON s.id = p.supplier_id
WHERE p.dimensions IS NOT NULL
  AND (
    -- Tem alguma divergência
    ABS(COALESCE(p.length_cm, 0) - COALESCE((p.dimensions->>'length_cm')::numeric, 0)) > 0.1
    OR ABS(COALESCE(p.width_cm, 0) - COALESCE((p.dimensions->>'width_cm')::numeric, 0)) > 0.1
    OR ABS(COALESCE(p.height_cm, 0) - COALESCE((p.dimensions->>'height_cm')::numeric, 0)) > 0.1
    -- OU tem unit_detected sem escalar
    OR (p.dimensions->>'unit_detected') IS NOT NULL
  )
ORDER BY
  (ABS(COALESCE(p.length_cm, 0) - COALESCE((p.dimensions->>'length_cm')::numeric, 0)) > 0.1)::int +
  (ABS(COALESCE(p.width_cm, 0) - COALESCE((p.dimensions->>'width_cm')::numeric, 0)) > 0.1)::int +
  (ABS(COALESCE(p.height_cm, 0) - COALESCE((p.dimensions->>'height_cm')::numeric, 0)) > 0.1)::int
  DESC,
  p.is_active DESC;

COMMENT ON VIEW public.v_products_dimensions_audit IS
'Auditoria de divergências entre dimensions (jsonb) e colunas escalares.
Escalar = fonte de verdade após backfill 2026-06-23.
unit_detected: chave do jsonb sem escalar equivalente (detectado pelo pipeline).
Criado em C1 2026-06-23 para apoiar a decisão de DROP de dimensions.';
;
