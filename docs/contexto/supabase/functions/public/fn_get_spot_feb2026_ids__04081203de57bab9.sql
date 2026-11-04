CREATE OR REPLACE FUNCTION public.fn_get_spot_feb2026_ids(p_offset integer DEFAULT 0, p_limit integer DEFAULT 500)
 RETURNS TABLE(cloudflare_image_id text, filename text, image_type text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT pi.cloudflare_image_id, pi.filename, pi.image_type
  FROM product_images pi
  JOIN products p ON p.id=pi.product_id
  JOIN suppliers s ON s.id=p.supplier_id
  WHERE s.code='STRICKER'
    AND pi.created_at::date IN ('2026-02-04','2026-02-06')
  ORDER BY pi.cloudflare_image_id
  LIMIT p_limit OFFSET p_offset;
$function$
