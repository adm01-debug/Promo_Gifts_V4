CREATE OR REPLACE FUNCTION public.get_cloudflare_video_thumbnail(p_video_id character varying, p_time_seconds integer DEFAULT NULL::integer, p_width integer DEFAULT NULL::integer, p_height integer DEFAULT NULL::integer)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE v_url text;
BEGIN
  IF p_video_id IS NULL OR p_video_id = '' THEN RETURN NULL; END IF;

  v_url := 'https://customer-ksi0mrlcw6rwzezz.cloudflarestream.com/'
    || p_video_id || '/thumbnails/thumbnail.jpg';

  -- Parâmetros opcionais (CF Stream API)
  IF p_time_seconds IS NOT NULL OR p_width IS NOT NULL OR p_height IS NOT NULL THEN
    v_url := v_url || '?';
    IF p_time_seconds IS NOT NULL THEN v_url := v_url || 'time=' || p_time_seconds || 's&'; END IF;
    IF p_width        IS NOT NULL THEN v_url := v_url || 'width=' || p_width           || '&'; END IF;
    IF p_height       IS NOT NULL THEN v_url := v_url || 'height=' || p_height         || '&'; END IF;
    v_url := rtrim(v_url, '&');
  END IF;

  RETURN v_url;
END;
$function$
