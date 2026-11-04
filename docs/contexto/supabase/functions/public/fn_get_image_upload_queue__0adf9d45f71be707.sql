CREATE OR REPLACE FUNCTION public.fn_get_image_upload_queue(p_supplier text, p_limit integer DEFAULT 25)
 RETURNS TABLE(id uuid, product_id uuid, url_original text, url_cdn text, image_type text, is_primary boolean, color_id uuid, display_order integer, cloudflare_image_id character varying)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    pi.id, pi.product_id,
    COALESCE(pi.url_original, pi.url_cdn) AS url_original,
    pi.url_cdn, pi.image_type, pi.is_primary,
    pi.color_id, pi.display_order, pi.cloudflare_image_id
  FROM product_images pi
  WHERE pi.source_supplier = p_supplier
    AND pi.url_cdn NOT LIKE 'https://imagedelivery.net%'
    AND pi.is_active = true
  ORDER BY pi.created_at ASC
  LIMIT p_limit;
$function$
