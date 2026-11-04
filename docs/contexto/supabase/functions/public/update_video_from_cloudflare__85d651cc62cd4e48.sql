CREATE OR REPLACE FUNCTION public.update_video_from_cloudflare(p_cloudflare_video_id character varying, p_status character varying, p_duration_seconds integer DEFAULT NULL::integer, p_width_px integer DEFAULT NULL::integer, p_height_px integer DEFAULT NULL::integer, p_thumbnail_url text DEFAULT NULL::text, p_error_message text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_video_id uuid;
  v_cf_sub CONSTANT text := 'customer-ksi0mrlcw6rwzezz';
BEGIN
  UPDATE product_videos SET
    cloudflare_status = p_status,
    duration_seconds  = COALESCE(p_duration_seconds, duration_seconds),
    width_px          = COALESCE(p_width_px, width_px),
    height_px         = COALESCE(p_height_px, height_px),
    url_thumbnail     = COALESCE(p_thumbnail_url,
      'https://' || v_cf_sub || '.cloudflarestream.com/' || cloudflare_video_id || '/thumbnails/thumbnail.jpg'),
    cloudflare_error  = p_error_message,
    updated_at        = now()
  WHERE cloudflare_video_id = p_cloudflare_video_id
  RETURNING id INTO v_video_id;

  RETURN v_video_id IS NOT NULL;
END;
$function$
