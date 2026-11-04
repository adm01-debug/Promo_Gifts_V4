CREATE OR REPLACE FUNCTION public.get_product_images_by_type(p_product_id uuid, p_type_code character varying)
 RETURNS TABLE(image_id uuid, cloudflare_id character varying, url_cdn text, url_thumbnail text, url_medium text, url_large text, filename character varying, color_id uuid, display_order integer)
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
        pi.filename,
        pi.color_id,
        pi.display_order
    FROM product_images pi
    LEFT JOIN image_types it ON pi.image_type_id = it.id
    WHERE pi.product_id = p_product_id
      AND pi.is_active = true
      AND it.code = p_type_code
    ORDER BY pi.display_order;
END;
$function$
