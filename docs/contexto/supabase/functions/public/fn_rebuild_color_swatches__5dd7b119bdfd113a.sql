CREATE OR REPLACE FUNCTION public.fn_rebuild_color_swatches(p_product_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    jsonb_agg(
      swatch
      ORDER BY (swatch->>'stock_quantity')::int DESC, swatch->>'color_name' ASC
    ),
    '[]'::jsonb
  )
  FROM (
    SELECT DISTINCT ON (agg.color_id)
      jsonb_build_object(
        'variant_id',     agg.lead_variant_id,
        'sku',            agg.lead_sku,
        'color_id',       agg.color_id,
        'color_name',     agg.color_name,
        'color_hex',      agg.color_hex,
        'stock_quantity', agg.total_stock,
        'is_in_stock',    agg.total_stock > 0,
        'image_url',      COALESCE(
          (SELECT pi.url_cdn
           FROM product_images pi
           WHERE pi.product_id  = p_product_id
             AND pi.variant_id  = agg.lead_variant_id
             AND pi.is_active   = true
             AND pi.image_type  IN ('main','gallery','product')
           ORDER BY pi.is_primary DESC, pi.display_order ASC NULLS LAST
           LIMIT 1),
          (SELECT pi.url_cdn
           FROM product_images pi
           WHERE pi.product_id  = p_product_id
             AND pi.color_id    = agg.color_id
             AND pi.variant_id  IS NULL
             AND pi.is_active   = true
             AND pi.image_type  IN ('main','gallery','product')
           ORDER BY pi.is_primary DESC, pi.display_order ASC NULLS LAST
           LIMIT 1),
          (SELECT pi.url_cdn
           FROM product_images pi
           WHERE pi.product_id  = p_product_id
             AND pi.color_id    = agg.color_id
             AND pi.variant_id  IS NOT NULL
             AND pi.is_active   = true
             AND pi.image_type  IN ('main','gallery','product')
           ORDER BY pi.is_primary DESC, pi.display_order ASC NULLS LAST
           LIMIT 1),
          agg.lead_images_first,
          (SELECT p.primary_image_url FROM products p WHERE p.id = p_product_id)
        )
      ) AS swatch
    FROM (
      SELECT
        pv2.color_id,
        COALESCE(pv2.color_name, cv.name)    AS color_name,
        COALESCE(pv2.color_hex, cv.hex_code) AS color_hex,
        SUM(COALESCE(pv2.stock_quantity, 0)) AS total_stock,
        (ARRAY_AGG(pv2.id   ORDER BY COALESCE(pv2.stock_quantity,0) DESC, pv2.sku ASC))[1] AS lead_variant_id,
        (ARRAY_AGG(pv2.sku  ORDER BY COALESCE(pv2.stock_quantity,0) DESC, pv2.sku ASC))[1] AS lead_sku,
        (ARRAY_AGG(pv2.images->>0 ORDER BY COALESCE(pv2.stock_quantity,0) DESC, pv2.sku ASC))[1] AS lead_images_first
      FROM product_variants pv2
      LEFT JOIN color_variations cv ON cv.id = pv2.color_id
      WHERE pv2.product_id = p_product_id
        AND pv2.is_active  = true
        AND pv2.color_id   IS NOT NULL
      GROUP BY
        pv2.color_id,
        COALESCE(pv2.color_name, cv.name),
        COALESCE(pv2.color_hex, cv.hex_code)
    ) agg
    ORDER BY agg.color_id, agg.total_stock DESC
  ) sub;
$function$
