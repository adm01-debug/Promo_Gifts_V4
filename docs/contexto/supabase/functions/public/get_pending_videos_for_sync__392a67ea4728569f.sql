CREATE OR REPLACE FUNCTION public.get_pending_videos_for_sync(p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, product_id uuid, url_original text, source_youtube_id character varying, title character varying, video_type character varying)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        pv.id,
        pv.product_id,
        pv.url_original,
        pv.source_youtube_id,
        pv.title,
        pv.video_type
    FROM product_videos pv
    WHERE pv.is_active = true
      AND (pv.url_original IS NOT NULL OR pv.source_youtube_id IS NOT NULL)
      AND (pv.cloudflare_video_id IS NULL OR pv.cloudflare_video_id LIKE 'cf-vid-%')
    ORDER BY pv.created_at ASC
    LIMIT p_limit;
END;
$function$
