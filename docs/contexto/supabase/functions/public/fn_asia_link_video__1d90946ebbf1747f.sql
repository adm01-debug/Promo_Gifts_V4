CREATE OR REPLACE FUNCTION public.fn_asia_link_video(p_queue_id uuid, p_youtube_id text, p_cf_stream_uid text, p_url_hls text, p_url_thumbnail text, p_url_embed text, p_duration_seconds integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated    int;
  v_pid        uuid;
  -- FIXED 2026-06-14: accountHash correto (era cd0f4eee...)
  v_cf_sub     CONSTANT text := 'customer-ksi0mrlcw6rwzezz';
  v_hls        text;
  v_thumbnail  text;
  v_embed      text;
BEGIN
  v_hls       := 'https://' || v_cf_sub || '.cloudflarestream.com/' || p_cf_stream_uid || '/manifest/video.m3u8';
  v_thumbnail := 'https://' || v_cf_sub || '.cloudflarestream.com/' || p_cf_stream_uid || '/thumbnails/thumbnail.jpg';
  v_embed     := 'https://iframe.cloudflarestream.com/' || p_cf_stream_uid;

  -- 1. product_videos: youtube → ready (pode afetar múltiplos produtos)
  UPDATE product_videos
  SET
    cloudflare_video_id = p_cf_stream_uid,
    url_stream          = v_embed,
    url_hls             = v_hls,
    url_thumbnail       = v_thumbnail,
    cloudflare_status   = 'ready',
    duration_seconds    = COALESCE(p_duration_seconds, duration_seconds),
    uploaded_at         = now(),
    updated_at          = now()
  WHERE source_youtube_id = p_youtube_id
    AND source_supplier   = 'ASIA'
    AND is_active         = true;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- 2. Atualizar products.videos cache para CADA produto afetado
  FOR v_pid IN
    SELECT DISTINCT product_id FROM product_videos
    WHERE source_youtube_id = p_youtube_id
      AND source_supplier   = 'ASIA'
      AND is_active         = true
  LOOP
    UPDATE products
    SET
      videos = (
        SELECT jsonb_agg(
          CASE
            WHEN entry->>'youtube_id' = p_youtube_id THEN
              jsonb_build_object(
                'id',         (SELECT id::text FROM product_videos
                               WHERE source_youtube_id = p_youtube_id
                                 AND source_supplier = 'ASIA'
                                 AND product_id = v_pid LIMIT 1),
                'youtube_id', p_youtube_id,
                'cf_uid',     p_cf_stream_uid,
                'embed_url',  v_embed,
                'hls_url',    v_hls,
                'thumbnail',  v_thumbnail,
                'watch_url',  entry->>'watch_url',
                'is_primary', (entry->>'is_primary')::boolean,
                'title',      entry->>'title',
                'plataforma', 'cloudflare_stream',
                'duration_s', p_duration_seconds
              )
            ELSE entry
          END
          ORDER BY (entry->>'is_primary')::boolean DESC NULLS LAST
        )
        FROM jsonb_array_elements(videos) AS entry
      ),
      updated_at = now()
    WHERE id = v_pid
      AND videos IS NOT NULL
      AND jsonb_array_length(videos) > 0;
  END LOOP;

  -- 3. video_import_queue: linked
  UPDATE video_import_queue
  SET
    cloudflare_video_id         = p_cf_stream_uid,
    cloudflare_hls              = v_hls,
    cloudflare_thumbnail        = v_thumbnail,
    cloudflare_embed            = v_embed,
    cloudflare_duration_seconds = p_duration_seconds,
    status                      = 'linked',
    completed_at                = now()
  WHERE id = p_queue_id;

  RETURN jsonb_build_object(
    'ok',             true,
    'youtube_id',     p_youtube_id,
    'cf_stream_uid',  p_cf_stream_uid,
    'videos_updated', v_updated
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$function$
