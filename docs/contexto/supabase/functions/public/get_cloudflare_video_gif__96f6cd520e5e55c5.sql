CREATE OR REPLACE FUNCTION public.get_cloudflare_video_gif(p_video_id character varying, p_start_seconds integer DEFAULT 0, p_duration_seconds integer DEFAULT 5)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_video_id IS NULL OR p_video_id = '' THEN RETURN NULL; END IF;
  -- CF Stream GIF API: /thumbnails/thumbnail.gif?time=Xs&duration=Ys
  RETURN 'https://customer-ksi0mrlcw6rwzezz.cloudflarestream.com/'
    || p_video_id
    || '/thumbnails/thumbnail.gif?time=' || p_start_seconds || 's'
    || '&duration=' || p_duration_seconds || 's';
END;
$function$
