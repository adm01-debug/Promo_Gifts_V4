CREATE OR REPLACE FUNCTION public.get_variants_for_commemorative_date(p_slug text, p_limit integer DEFAULT 100, p_include_all_colors boolean DEFAULT false)
 RETURNS TABLE(product_id uuid, product_name text, product_sku text, variant_id uuid, variant_name text, variant_sku text, color_name text, color_hex text, color_group_id uuid, color_group_name text, is_primary_color boolean, price_1 numeric, image_url text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    WITH date_colors AS (
        SELECT cdc.color_group_id, cdc.is_primary
        FROM commemorative_date_colors cdc
        JOIN commemorative_dates cd ON cd.id = cdc.commemorative_date_id
        WHERE cd.slug = p_slug AND cd.is_active = TRUE
    ),
    exclusions AS (
        SELECT cde.product_id, cde.variant_id
        FROM commemorative_date_exclusions cde
        JOIN commemorative_dates cd ON cd.id = cde.commemorative_date_id
        WHERE cd.slug = p_slug
    ),
    variants_data AS (
        SELECT 
            p.id AS product_id,
            p.name AS product_name,
            p.sku AS product_sku,
            pv.id AS variant_id,
            pv.name AS variant_name,
            pv.sku AS variant_sku,
            pv.color_name,
            pv.color_hex,
            cg.id AS color_group_id,
            cg.name AS color_group_name,
            COALESCE(dc.is_primary, FALSE) AS is_primary_color,
            pv.price_1,
            COALESCE((pv.images->>0)::TEXT, p.primary_image_url) AS image_url
        FROM product_variants pv
        JOIN products p ON p.id = pv.product_id
        LEFT JOIN color_variations cv ON LOWER(cv.name) = LOWER(pv.color_name)
        LEFT JOIN color_groups cg ON cg.id = cv.group_id
        LEFT JOIN date_colors dc ON dc.color_group_id = cg.id
        WHERE pv.is_active = TRUE
          AND p.is_active = TRUE
          AND (p_include_all_colors OR dc.color_group_id IS NOT NULL)
          AND NOT EXISTS (
              SELECT 1 FROM exclusions ex
              WHERE ex.product_id = p.id OR ex.variant_id = pv.id
          )
    )
    SELECT DISTINCT ON (vd.variant_id)
        vd.product_id,
        vd.product_name,
        vd.product_sku,
        vd.variant_id,
        vd.variant_name,
        vd.variant_sku,
        vd.color_name,
        vd.color_hex,
        vd.color_group_id,
        vd.color_group_name,
        vd.is_primary_color,
        vd.price_1,
        vd.image_url
    FROM variants_data vd
    ORDER BY vd.variant_id, vd.is_primary_color DESC
    LIMIT p_limit;
$function$
