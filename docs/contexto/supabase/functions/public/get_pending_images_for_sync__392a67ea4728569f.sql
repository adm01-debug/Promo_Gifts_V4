CREATE OR REPLACE FUNCTION public.get_pending_images_for_sync(p_limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, product_id uuid, url_original text, image_type character varying, variant_id uuid, color_id uuid)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        pi.id,
        pi.product_id,
        pi.url_original,
        pi.image_type,
        pi.variant_id,
        pi.color_id
    FROM product_images pi
    WHERE pi.is_active = true
      AND pi.url_original IS NOT NULL
      AND pi.url_original != ''
      AND (pi.cloudflare_image_id IS NULL OR pi.cloudflare_image_id LIKE 'cf-img-%')
    ORDER BY pi.created_at ASC
    LIMIT p_limit;
END;
$function$
