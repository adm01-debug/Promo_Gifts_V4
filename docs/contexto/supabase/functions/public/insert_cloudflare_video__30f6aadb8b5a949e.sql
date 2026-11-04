CREATE OR REPLACE FUNCTION public.insert_cloudflare_video(p_product_id uuid, p_cloudflare_video_id character varying, p_video_type character varying DEFAULT 'demo'::character varying, p_title character varying DEFAULT NULL::character varying, p_duration_seconds integer DEFAULT NULL::integer, p_width_px integer DEFAULT NULL::integer, p_height_px integer DEFAULT NULL::integer, p_is_primary boolean DEFAULT false, p_supplier_code character varying DEFAULT 'PROMO_BRINDES'::character varying)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_video_id    uuid;
  v_existing_id uuid;
  v_cf_sub CONSTANT text := 'customer-ksi0mrlcw6rwzezz';
BEGIN
  -- Verificar se já existe
  SELECT id INTO v_existing_id
  FROM product_videos
  WHERE product_id = p_product_id
    AND cloudflare_video_id = p_cloudflare_video_id;

  IF v_existing_id IS NOT NULL THEN
    UPDATE product_videos SET
      title            = COALESCE(p_title, title),
      duration_seconds = COALESCE(p_duration_seconds, duration_seconds),
      width_px         = COALESCE(p_width_px, width_px),
      height_px        = COALESCE(p_height_px, height_px),
      cloudflare_status = 'ready',
      updated_at       = now()
    WHERE id = v_existing_id;
    RETURN v_existing_id;
  END IF;

  IF p_is_primary THEN
    UPDATE product_videos SET is_primary = false
    WHERE product_id = p_product_id AND is_primary = true;
  END IF;

  INSERT INTO product_videos (
    product_id, cloudflare_video_id,
    url_stream, url_hls, url_thumbnail,
    video_type, title, duration_seconds, width_px, height_px,
    source_supplier, cloudflare_status, is_primary, display_order, is_active, uploaded_at
  ) VALUES (
    p_product_id,
    p_cloudflare_video_id,
    'https://iframe.cloudflarestream.com/' || p_cloudflare_video_id,
    'https://' || v_cf_sub || '.cloudflarestream.com/' || p_cloudflare_video_id || '/manifest/video.m3u8',
    'https://' || v_cf_sub || '.cloudflarestream.com/' || p_cloudflare_video_id || '/thumbnails/thumbnail.jpg',
    p_video_type, p_title, p_duration_seconds, p_width_px, p_height_px,
    p_supplier_code, 'ready', p_is_primary,
    COALESCE((SELECT MAX(display_order)+1 FROM product_videos WHERE product_id=p_product_id), 1),
    true, now()
  ) RETURNING id INTO v_video_id;

  RETURN v_video_id;
END;
$function$
