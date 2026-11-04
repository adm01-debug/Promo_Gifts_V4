CREATE OR REPLACE FUNCTION public.fn_video_link_to_products(p_queue_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_queue record;
  v_product_id uuid;
  v_ref text;
  v_count integer := 0;
  v_existing_id uuid;
BEGIN
  SELECT * INTO v_queue FROM video_import_queue WHERE id = p_queue_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Guards de integridade: product_videos exige cloudflare_video_id e url_stream
  -- (=cloudflare_embed) NOT NULL. Sem eles não há vídeo Cloudflare válido a vincular.
  IF v_queue.cloudflare_video_id IS NULL OR v_queue.cloudflare_embed IS NULL THEN
    RETURN 0;
  END IF;

  FOREACH v_ref IN ARRAY v_queue.product_references
  LOOP
    SELECT id INTO v_product_id FROM products WHERE supplier_reference = v_ref LIMIT 1;
    IF v_product_id IS NOT NULL THEN
      -- Idempotência segura: se o vídeo já existe p/ este produto, faz UPDATE direto.
      -- Isso evita a colisão entre o trigger BEFORE INSERT (ensure_single_primary_video,
      -- que demove a linha existente) e o ON CONFLICT DO UPDATE (que tentaria atualizar
      -- a mesma linha) — origem do erro "cannot affect row a second time".
      SELECT id INTO v_existing_id
      FROM product_videos
      WHERE product_id = v_product_id
        AND cloudflare_video_id = v_queue.cloudflare_video_id
      LIMIT 1;

      IF v_existing_id IS NOT NULL THEN
        -- is_primary NÃO é alterado (preserva semântica do antigo ON CONFLICT DO UPDATE).
        UPDATE product_videos SET
          url_stream    = v_queue.cloudflare_embed,
          url_hls       = v_queue.cloudflare_hls,
          url_thumbnail = v_queue.cloudflare_thumbnail,
          cloudflare_status = 'ready',
          updated_at = now()
        WHERE id = v_existing_id;
      ELSE
        INSERT INTO product_videos (
          product_id, cloudflare_video_id, source_youtube_id, source_supplier,
          url_stream, url_hls, url_thumbnail, url_original,
          duration_seconds, file_size_bytes, cloudflare_status,
          video_type, is_primary, is_active, organization_id
        ) VALUES (
          v_product_id, v_queue.cloudflare_video_id, v_queue.youtube_id, v_queue.source_supplier,
          v_queue.cloudflare_embed, v_queue.cloudflare_hls, v_queue.cloudflare_thumbnail,
          v_queue.youtube_url, v_queue.cloudflare_duration_seconds, v_queue.file_size_bytes,
          'ready', 'product_video', true, true, '5db5aee1-064b-4ef4-9193-345dcd8274ea'
        );
      END IF;
      v_count := v_count + 1;
      v_existing_id := NULL;
    END IF;
  END LOOP;

  UPDATE video_import_queue SET status = 'linked' WHERE id = p_queue_id AND status = 'done';
  RETURN v_count;
END;
$function$
