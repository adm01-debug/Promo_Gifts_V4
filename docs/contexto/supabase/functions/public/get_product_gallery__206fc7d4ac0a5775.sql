CREATE OR REPLACE FUNCTION public.get_product_gallery(p_product_id uuid, p_color_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(image_id uuid, cloudflare_id character varying, url_cdn text, url_thumbnail text, url_medium text, url_large text, image_type character varying, image_type_name character varying, color_id uuid, display_order integer, is_primary boolean)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        pi.id,
        pi.cloudflare_image_id,
        pi.url_cdn,
        pi.url_cdn || '/thumbnail',
        pi.url_cdn || '/medium',
        pi.url_cdn || '/large',
        it.code,
        it.name,
        pi.color_id,
        pi.display_order,
        pi.is_primary
    FROM product_images pi
    LEFT JOIN image_types it ON pi.image_type_id = it.id
    WHERE pi.product_id = p_product_id
      AND pi.is_active = true
      AND (it.show_in_gallery = true OR it.code IN ('main', 'gallery', 'product', 'lifestyle', 'set'))
      AND (p_color_id IS NULL OR pi.color_id IS NULL OR pi.color_id = p_color_id)
    ORDER BY 
        pi.is_primary DESC, 
        COALESCE(it.gallery_order, 99),
        pi.display_order;
END;
$function$
