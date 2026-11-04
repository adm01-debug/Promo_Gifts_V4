CREATE OR REPLACE FUNCTION public.get_product_primary_video(p_product_id uuid)
 RETURNS TABLE(video_id uuid, cloudflare_id character varying, url_embed text, url_hls text, url_thumbnail text, url_thumbnail_hq text, duration_seconds integer, title character varying, source_youtube_id character varying)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  -- DEPRECATED: use v_product_videos_ready diretamente
  -- Mantida apenas para compatibilidade com código legado
  RETURN QUERY
  SELECT
    v.video_id,
    v.cloudflare_uid,
    v.url_embed,
    v.url_hls,
    v.url_thumbnail_detail,
    v.url_thumbnail_detail,
    v.duration_seconds,
    v.title,
    v.source_youtube_id
  FROM v_product_videos_ready v
  WHERE v.product_id = p_product_id
  ORDER BY v.is_primary DESC, v.display_order
  LIMIT 1;
END;
$function$
