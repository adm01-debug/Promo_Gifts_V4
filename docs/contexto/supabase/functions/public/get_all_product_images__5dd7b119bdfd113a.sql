CREATE OR REPLACE FUNCTION public.get_all_product_images(p_product_id uuid)
 RETURNS TABLE(image_id uuid, cloudflare_id character varying, url_cdn text, url_thumbnail text, image_type character varying, image_type_name character varying, image_type_category character varying, color_id uuid, display_order integer, is_primary boolean, show_in_gallery boolean, show_in_simulator boolean)
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
        it.code,
        it.name,
        it.category,
        pi.color_id,
        pi.display_order,
        pi.is_primary,
        it.show_in_gallery,
        it.show_in_simulator
    FROM product_images pi
    LEFT JOIN image_types it ON pi.image_type_id = it.id
    WHERE pi.product_id = p_product_id
      AND pi.is_active = true
    ORDER BY 
        it.display_priority,
        pi.is_primary DESC,
        pi.display_order;
END;
$function$
