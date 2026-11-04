CREATE OR REPLACE FUNCTION public.fn_sync_products_videos_cache(p_supplier_id uuid DEFAULT NULL::uuid, p_dry_run boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_synced   integer := 0;
  v_orphaned integer := 0;
  -- FIXED 2026-06-14: accountHash correto (era cd0f4eee...) — referência semântica
  v_cf_sub CONSTANT text := 'customer-ksi0mrlcw6rwzezz';
BEGIN
  IF p_dry_run THEN
    SELECT COUNT(DISTINCT pv.product_id)
    INTO v_synced
    FROM product_videos pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.cloudflare_status = 'ready'
      AND pv.is_active = true
      AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
      AND (
        p.videos IS NULL 
        OR jsonb_array_length(p.videos) = 0
        OR NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(p.videos) AS v
          WHERE v->>'youtube_id' = pv.source_youtube_id
            AND v->>'plataforma' = 'cloudflare_stream'
        )
      );
    
    RETURN jsonb_build_object(
      'ok', true,
      'mode', 'dry_run',
      'supplier_filter', p_supplier_id,
      'products_to_sync', v_synced
    );
  END IF;

  -- APPLY: rebuilda products.videos a partir de product_videos ready
  WITH product_video_aggregation AS (
    SELECT 
      p.id AS product_id,
      jsonb_agg(
        jsonb_build_object(
          'id',         pv.id::text,
          'youtube_id', pv.source_youtube_id,
          'cf_uid',     CASE WHEN pv.cloudflare_status = 'ready' AND pv.cloudflare_video_id !~ '^(sm_|spot_)' 
                          THEN pv.cloudflare_video_id ELSE NULL END,
          'embed_url',  pv.url_stream,
          'hls_url',    pv.url_hls,
          'thumbnail',  pv.url_thumbnail,
          'watch_url',  pv.url_original,
          'is_primary', COALESCE(pv.is_primary, false),
          'title',      pv.title,
          'plataforma', CASE WHEN pv.cloudflare_status = 'ready' THEN 'cloudflare_stream' ELSE 'youtube' END,
          'duration_s', pv.duration_seconds
        )
        ORDER BY COALESCE(pv.is_primary, false) DESC, pv.display_order, pv.created_at
      ) AS videos_json
    FROM product_videos pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.is_active = true
      AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
    GROUP BY p.id
  ),
  upd AS (
    UPDATE products
    SET videos = pva.videos_json,
        updated_at = NOW()
    FROM product_video_aggregation pva
    WHERE products.id = pva.product_id
      AND (
        products.videos IS NULL
        OR products.videos::text IS DISTINCT FROM pva.videos_json::text
      )
    RETURNING products.id
  )
  SELECT COUNT(*) INTO v_synced FROM upd;

  -- Detectar órfãos
  SELECT COUNT(*) INTO v_orphaned FROM products p
  WHERE (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
    AND p.videos IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(p.videos) AS v
      WHERE NOT EXISTS (
        SELECT 1 FROM product_videos pv 
        WHERE pv.product_id = p.id 
          AND pv.source_youtube_id = v->>'youtube_id'
          AND pv.is_active = true
      )
    );

  RETURN jsonb_build_object(
    'ok', true,
    'mode', 'apply',
    'supplier_filter', p_supplier_id,
    'products_synced', v_synced,
    'products_with_orphan_entries', v_orphaned
  );
END;
$function$
