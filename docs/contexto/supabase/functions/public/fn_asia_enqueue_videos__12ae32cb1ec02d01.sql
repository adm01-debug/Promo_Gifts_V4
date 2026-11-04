CREATE OR REPLACE FUNCTION public.fn_asia_enqueue_videos()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_enfileirados int := 0;
BEGIN
  INSERT INTO video_import_queue (
    youtube_id,
    youtube_url,
    source_supplier,
    product_references,
    status
  )
  SELECT DISTINCT ON (pv.source_youtube_id)
    pv.source_youtube_id                AS youtube_id,
    pv.url_original                     AS youtube_url,
    'asia'                              AS source_supplier,
    ARRAY[p.supplier_reference]         AS product_references,
    'pending'                           AS status
  FROM product_videos pv
  JOIN products p ON p.id = pv.product_id
  WHERE pv.source_supplier = 'ASIA'
    AND pv.cloudflare_status = 'youtube'
    AND pv.source_youtube_id IS NOT NULL
    AND p.supplier_reference IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM video_import_queue viq
      WHERE viq.youtube_id = pv.source_youtube_id
        AND viq.source_supplier = 'asia'
    )
  ORDER BY pv.source_youtube_id, pv.created_at ASC;

  GET DIAGNOSTICS v_enfileirados = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok',            true,
    'enfileirados',  v_enfileirados,
    'fila_pendente', (SELECT COUNT(*) FROM video_import_queue
                       WHERE source_supplier = 'asia' AND status = 'pending')
  );
END;
$function$
