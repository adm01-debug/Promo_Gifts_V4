
-- ============================================================
-- FIX 8: View de saúde operacional de product_images
-- ============================================================

CREATE OR REPLACE VIEW public.vw_product_images_health AS
WITH
  base AS (
    SELECT
      COUNT(*)                                                       AS total_images,
      COUNT(*) FILTER (WHERE is_active = true)                       AS active_images,
      COUNT(*) FILTER (WHERE is_active = false)                      AS inactive_images,
      COUNT(DISTINCT product_id)                                     AS products_with_images,
      COUNT(*) FILTER (WHERE is_primary = true AND is_active = true) AS primary_images,
      COUNT(*) FILTER (WHERE is_og_image = true AND is_active = true) AS og_images,
      COUNT(*) FILTER (WHERE color_id IS NOT NULL)                   AS images_with_color,
      COUNT(*) FILTER (WHERE variant_id IS NOT NULL)                 AS images_with_variant,
      COUNT(*) FILTER (WHERE width_px IS NOT NULL)                   AS with_dimensions,
      COUNT(*) FILTER (WHERE width_px IS NULL AND is_active = true)  AS missing_dimensions,
      COUNT(*) FILTER (WHERE alt_text IS NOT NULL AND alt_text <> '') AS with_alt_text,
      COUNT(*) FILTER (WHERE alt_text IS NULL OR alt_text = '')      AS missing_alt_text,
      COUNT(*) FILTER (WHERE url_original IS NOT NULL)               AS with_fallback_url,
      COUNT(*) FILTER (WHERE image_type_id IS NULL)                  AS missing_type_id,
      COUNT(*) FILTER (WHERE width_px >= 1200 AND height_px >= 1200) AS dim_otimas,
      COUNT(*) FILTER (WHERE width_px >= 800  AND height_px >= 800
                             AND (width_px < 1200 OR height_px < 1200)) AS dim_aceitaveis,
      COUNT(*) FILTER (WHERE width_px < 800 OR height_px < 800)     AS dim_ruins,
      MIN(created_at)                                                AS oldest_image,
      MAX(created_at)                                                AS newest_image,
      MAX(updated_at)                                                AS last_update
    FROM public.product_images
  ),
  supplier_totals AS (
    SELECT source_supplier, COUNT(*) AS cnt
    FROM public.product_images
    WHERE is_active = true
    GROUP BY source_supplier
  ),
  supplier_total_sum AS (
    SELECT SUM(cnt) AS total FROM supplier_totals
  ),
  supplier_breakdown AS (
    SELECT jsonb_object_agg(
      st.source_supplier,
      jsonb_build_object(
        'total', st.cnt,
        'pct',   ROUND(100.0 * st.cnt / NULLIF(s.total, 0), 1)
      )
    ) AS by_supplier
    FROM supplier_totals st
    CROSS JOIN supplier_total_sum s
  ),
  products_gap AS (
    SELECT
      COUNT(*) FILTER (WHERE is_active = true)                              AS total_active_products,
      COUNT(*) FILTER (WHERE is_active = true AND primary_image_url IS NOT NULL) AS with_primary_url,
      COUNT(*) FILTER (WHERE is_active = true
                        AND (images IS NULL OR images = '[]'::jsonb))      AS without_images_json
    FROM public.products
  )
SELECT
  b.total_images,
  b.active_images,
  b.inactive_images,
  b.products_with_images,
  b.primary_images,
  b.og_images,
  b.images_with_color,
  b.images_with_variant,
  b.with_dimensions,
  b.missing_dimensions,
  ROUND(100.0 * b.with_dimensions / NULLIF(b.active_images, 0), 1)   AS pct_with_dimensions,
  b.dim_otimas,
  b.dim_aceitaveis,
  b.dim_ruins,
  b.with_alt_text,
  b.missing_alt_text,
  ROUND(100.0 * b.with_alt_text / NULLIF(b.total_images, 0), 1)     AS pct_seo_coverage,
  b.with_fallback_url,
  ROUND(100.0 * b.with_fallback_url / NULLIF(b.active_images, 0), 1) AS pct_with_fallback,
  b.missing_type_id,
  s.by_supplier,
  pg.total_active_products,
  pg.with_primary_url,
  pg.without_images_json,
  pg.total_active_products - b.products_with_images                  AS active_products_no_images,
  b.oldest_image,
  b.newest_image,
  b.last_update,
  NOW()                                                               AS snapshot_at
FROM base b
CROSS JOIN supplier_breakdown s
CROSS JOIN products_gap pg;

COMMENT ON VIEW public.vw_product_images_health IS
  'Dashboard de saúde operacional de product_images.
   KPIs: volume, dimensões, SEO, fallback URLs, gap produtos sem imagem, por fornecedor.
   Adicionada 2026-06-15 como parte do hardening da tabela.
   Consultar com: SELECT * FROM vw_product_images_health;';
;
