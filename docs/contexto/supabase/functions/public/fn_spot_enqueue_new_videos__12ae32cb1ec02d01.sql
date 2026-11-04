CREATE OR REPLACE FUNCTION public.fn_spot_enqueue_new_videos()
 RETURNS TABLE(enfileirados integer, ja_existentes integer, sem_video integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_enfileirados  INT := 0;
  v_existentes    INT := 0;
  v_sem_video     INT := 0;
  v_yt_id         TEXT;
  rec             RECORD;
BEGIN
  FOR rec IN
    SELECT DISTINCT ON (
      COALESCE(
        extract_youtube_id(spr.raw_data->>'VideoLink'),
        (regexp_match(spr.raw_data->>'VideoLink', '/shorts/([A-Za-z0-9_-]{11})'))[1]
      )
    )
      p.supplier_reference                                             AS ref,
      spr.raw_data->>'VideoLink'                                       AS video_url,
      COALESCE(
        extract_youtube_id(spr.raw_data->>'VideoLink'),
        (regexp_match(spr.raw_data->>'VideoLink', '/shorts/([A-Za-z0-9_-]{11})'))[1]
      )                                                                AS youtube_id
    FROM supplier_products_raw spr
    JOIN products p ON spr.product_id = p.id
    WHERE p.supplier_id = 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'
      AND spr.raw_data->>'VideoLink' IS NOT NULL
      AND spr.raw_data->>'VideoLink' != ''
    ORDER BY COALESCE(
      extract_youtube_id(spr.raw_data->>'VideoLink'),
      (regexp_match(spr.raw_data->>'VideoLink', '/shorts/([A-Za-z0-9_-]{11})'))[1]
    )
  LOOP
    IF rec.youtube_id IS NULL THEN
      v_sem_video := v_sem_video + 1;
      CONTINUE;
    END IF;

    -- Verifica se já existe na fila
    IF EXISTS (
      SELECT 1 FROM video_import_queue
      WHERE youtube_id = rec.youtube_id
        AND source_supplier = 'SPOT'
    ) THEN
      v_existentes := v_existentes + 1;
      CONTINUE;
    END IF;

    -- Enfileira como pending
    INSERT INTO video_import_queue (
      youtube_id,
      youtube_url,
      source_supplier,
      product_references,
      status
    )
    SELECT
      rec.youtube_id,
      rec.video_url,
      'SPOT',
      ARRAY_AGG(DISTINCT p2.supplier_reference),
      'pending'
    FROM supplier_products_raw spr2
    JOIN products p2 ON spr2.product_id = p2.id
    WHERE p2.supplier_id = 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'
      AND COALESCE(
        extract_youtube_id(spr2.raw_data->>'VideoLink'),
        (regexp_match(spr2.raw_data->>'VideoLink', '/shorts/([A-Za-z0-9_-]{11})'))[1]
      ) = rec.youtube_id;

    v_enfileirados := v_enfileirados + 1;
  END LOOP;

  RETURN QUERY SELECT v_enfileirados, v_existentes, v_sem_video;
END;
$function$
