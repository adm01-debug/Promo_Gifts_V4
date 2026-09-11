
-- Melhoria 3: v_dimensions_source_divergence — DROP e recria (colunas renomeadas)
DROP VIEW IF EXISTS public.v_dimensions_source_divergence;

CREATE VIEW public.v_dimensions_source_divergence AS
 SELECT p.id,
    p.sku,
    p.supplier_id,
    s.name AS supplier_name,
    p.dimensions_source,
    p.length_cm AS scalar_length_cm,
    p.width_cm AS scalar_width_cm,
    p.height_cm AS scalar_height_cm,
    p.weight_g,
    -- jsonb_* colunas mantidas para compat (retornam NULL após DROP do jsonb)
    NULL::numeric AS jsonb_length_cm,
    NULL::numeric AS jsonb_width_cm,
    NULL::numeric AS jsonb_height_cm,
    NULL::numeric AS length_diff_cm,
    NULL::numeric AS width_diff_cm,
    NULL::numeric AS height_diff_cm,
    CASE
      WHEN p.length_cm > 300 OR p.width_cm > 300 OR p.height_cm > 300 THEN 'critical'
      WHEN p.length_cm IS NULL OR p.width_cm IS NULL OR p.height_cm IS NULL THEN 'medium'
      ELSE 'low'
    END AS severity
   FROM (products p
     JOIN suppliers s ON ((s.id = p.supplier_id)))
  WHERE p.is_active = true
    AND (p.length_cm > 300 OR p.width_cm > 300 OR p.height_cm > 300
         OR p.length_cm <= 0 OR p.width_cm <= 0 OR p.height_cm <= 0)
  ORDER BY severity;

COMMENT ON VIEW public.v_dimensions_source_divergence IS
'Qualidade escalares de dimensão. Antes: comparava jsonb vs escalar. Após DROP jsonb (2026-06-23): só verifica escalares. jsonb_* colunas mantidas para compat (NULL).';

-- Melhoria 4: v_products_dimensions_audit — reorientar pós-DROP
DROP VIEW IF EXISTS public.v_products_dimensions_audit;

CREATE VIEW public.v_products_dimensions_audit AS
SELECT
  p.id AS product_id,
  p.sku,
  p.name,
  s.name AS supplier_name,
  p.is_active,
  p.dimensions_source,
  p.length_cm,
  p.width_cm,
  p.height_cm,
  p.diameter_cm,
  p.shape_type,
  p.weight_g,
  (p.length_cm IS NULL AND p.width_cm IS NULL AND p.height_cm IS NULL) AS sem_dimensoes,
  (p.length_cm IS NOT NULL AND p.width_cm IS NOT NULL AND p.height_cm IS NOT NULL) AS dimensoes_completas,
  p.dimensions_source IS NULL AS sem_fonte,
  CASE
    WHEN p.length_cm > 300 OR p.width_cm > 300 OR p.height_cm > 300 THEN 'CRITICO'
    WHEN p.length_cm IS NOT NULL AND p.width_cm IS NOT NULL AND p.height_cm IS NOT NULL
      AND p.dimensions_source IS NOT NULL THEN 'COMPLETO'
    WHEN p.length_cm IS NOT NULL OR p.width_cm IS NOT NULL THEN 'PARCIAL'
    ELSE 'VAZIO'
  END AS status_qualidade
FROM products p
LEFT JOIN suppliers s ON s.id = p.supplier_id
ORDER BY
  CASE WHEN p.length_cm > 300 OR p.width_cm > 300 OR p.height_cm > 300 THEN 0 ELSE 1 END,
  p.is_active DESC;

COMMENT ON VIEW public.v_products_dimensions_audit IS
'Auditoria qualidade escalares de dimensão pós-DROP do jsonb (2026-06-23). dimensions_source migrado de dimensions->unit_detected.';
;
