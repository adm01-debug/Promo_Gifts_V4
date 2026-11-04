CREATE OR REPLACE FUNCTION public.fn_spot_link_video(p_queue_id uuid, p_youtube_id text, p_cf_stream_uid text, p_url_hls text, p_url_thumbnail text, p_url_embed text, p_duration_seconds integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  -- FIXED 2026-06-14: accountHash correto (era cd0f4eee...)
  v_cf_sub   CONSTANT text := 'customer-ksi0mrlcw6rwzezz';
  v_hls      text;
  v_thumb    text;
  v_embed    text;
  v_linked   int := 0;
  v_ref      text;
  v_prod_id  uuid;
  v_pv_id    uuid;
  v_queue    record;
  v_exists   boolean;
BEGIN
  -- Valida queue_id
  SELECT EXISTS(SELECT 1 FROM video_import_queue WHERE id = p_queue_id) INTO v_exists;
  IF NOT v_exists THEN
    RETURN jsonb_build_object('ok', false, 'error', 'queue_id not found: ' || p_queue_id::text);
  END IF;

  SELECT * INTO v_queue FROM video_import_queue WHERE id = p_queue_id;

  v_hls   := COALESCE(p_url_hls,
    'https://' || v_cf_sub || '.cloudflarestream.com/' || p_cf_stream_uid || '/manifest/video.m3u8');
  v_thumb := COALESCE(p_url_thumbnail,
    'https://' || v_cf_sub || '.cloudflarestream.com/' || p_cf_stream_uid || '/thumbnails/thumbnail.jpg');
  v_embed := COALESCE(p_url_embed,
    'https://iframe.cloudflarestream.com/' || p_cf_stream_uid);

  -- 1. Para cada ref do produto na fila: upsert product_videos + atualiza products.videos
  FOREACH v_ref IN ARRAY v_queue.product_references LOOP
    SELECT id INTO v_prod_id
    FROM products
    WHERE supplier_reference = v_ref
      AND supplier_id = 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'
    LIMIT 1;

    CONTINUE WHEN v_prod_id IS NULL;

    -- Upsert: produto + cf_uid é chave única
    INSERT INTO product_videos (
      product_id, cloudflare_video_id, source_youtube_id, source_supplier,
      url_stream, url_hls, url_thumbnail, url_original,
      duration_seconds, cloudflare_status, video_type,
      is_primary, is_active, organization_id
    ) VALUES (
      v_prod_id, p_cf_stream_uid, p_youtube_id, 'SPOT',
      v_embed, v_hls, v_thumb, v_queue.youtube_url,
      p_duration_seconds, 'ready', 'product_video',
      true, true, '5db5aee1-064b-4ef4-9193-345dcd8274ea'
    )
    ON CONFLICT (product_id, cloudflare_video_id) DO UPDATE SET
      url_stream        = EXCLUDED.url_stream,
      url_hls           = EXCLUDED.url_hls,
      url_thumbnail     = EXCLUDED.url_thumbnail,
      cloudflare_status = 'ready',
      duration_seconds  = COALESCE(p_duration_seconds, product_videos.duration_seconds),
      updated_at        = now()
    RETURNING id INTO v_pv_id;

    -- 2. Atualizar products.videos JSONB cache
    UPDATE products p
    SET videos = (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',         pv2.id::text,
          'youtube_id', pv2.source_youtube_id,
          'cf_uid',     pv2.cloudflare_video_id,
          'embed_url',  pv2.url_stream,
          'hls_url',    pv2.url_hls,
          'thumbnail',  pv2.url_thumbnail,
          'watch_url',  pv2.url_original,
          'is_primary', pv2.is_primary,
          'plataforma', 'cloudflare_stream',
          'duration_s', pv2.duration_seconds
        )
        ORDER BY pv2.is_primary DESC NULLS LAST, pv2.created_at ASC
      )
      FROM product_videos pv2
      WHERE pv2.product_id = v_prod_id
        AND pv2.is_active = true
        AND pv2.cloudflare_status = 'ready'
        AND pv2.source_supplier = 'SPOT'
    ),
    updated_at = now()
    WHERE p.id = v_prod_id;

    v_linked := v_linked + 1;
  END LOOP;

  -- 3. Atualizar video_import_queue
  UPDATE video_import_queue
  SET
    cloudflare_video_id         = p_cf_stream_uid,
    cloudflare_hls              = v_hls,
    cloudflare_thumbnail        = v_thumb,
    cloudflare_embed            = v_embed,
    cloudflare_duration_seconds = p_duration_seconds,
    status                      = 'linked',
    completed_at                = now()
  WHERE id = p_queue_id;

  RETURN jsonb_build_object(
    'ok',             true,
    'youtube_id',     p_youtube_id,
    'cf_stream_uid',  p_cf_stream_uid,
    'videos_updated', v_linked
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$function$
