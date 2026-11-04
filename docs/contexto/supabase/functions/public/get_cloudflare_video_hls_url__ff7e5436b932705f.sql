CREATE OR REPLACE FUNCTION public.get_cloudflare_video_hls_url(p_video_id character varying)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_video_id IS NULL OR p_video_id = '' THEN RETURN NULL; END IF;
  RETURN 'https://customer-ksi0mrlcw6rwzezz.cloudflarestream.com/'
    || p_video_id || '/manifest/video.m3u8';
END;
$function$
