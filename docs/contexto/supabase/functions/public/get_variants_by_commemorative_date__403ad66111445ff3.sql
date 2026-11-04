CREATE OR REPLACE FUNCTION public.get_variants_by_commemorative_date(p_commemorative_date_slug text, p_limit integer DEFAULT 100)
 RETURNS TABLE(product_id uuid, product_name text, product_sku text, variant_id uuid, variant_name text, variant_sku text, color_name text, color_hex text, is_product_wide boolean, is_featured boolean, custom_description text, display_order integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.sku AS product_sku,
        pv.id AS variant_id,
        pv.name AS variant_name,
        pv.sku AS variant_sku,
        pv.color_name,
        pv.color_hex,
        (vcd.variant_id IS NULL) AS is_product_wide,
        vcd.is_featured,
        vcd.custom_description,
        vcd.display_order
    FROM variant_commemorative_dates vcd
    JOIN commemorative_dates cd ON cd.id = vcd.commemorative_date_id
    LEFT JOIN products p ON p.id = vcd.product_id
    LEFT JOIN product_variants pv ON pv.id = vcd.variant_id OR pv.product_id = vcd.product_id
    WHERE cd.slug = p_commemorative_date_slug
      AND (p.is_active = TRUE OR pv.is_active = TRUE)
    ORDER BY vcd.is_featured DESC, vcd.display_order, p.name, pv.color_name
    LIMIT p_limit;
$function$
