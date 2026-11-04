CREATE OR REPLACE FUNCTION public.fn_xbz_populate_videos_from_site(p_supplier_id uuid DEFAULT 'd6718a29-e954-4c1b-bd84-03ea24884900'::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '60s'
AS $function$
DECLARE
  v_videos_inseridos int := 0;
  v_t0               timestamptz := clock_timestamp();
BEGIN

  WITH videos_site AS (
    SELECT DISTINCT ON (spr.product_id)
      spr.product_id,
      spr.site_data->'video'->>'embed_id'   AS youtube_id,
      spr.site_data->'video'->>'embed_url'   AS embed_url,
      spr.site_data->'video'->>'watch_url'   AS watch_url,
      p.name                                  AS nome_produto
    FROM supplier_products_raw spr
    JOIN products p ON p.id = spr.product_id
    WHERE spr.supplier_id = p_supplier_id
      AND spr.site_status = 'processed'
      AND (spr.site_data->'video'->>'indicador') = 'true'
      AND (spr.site_data->'video'->>'embed_id') IS NOT NULL
      AND spr.product_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM product_videos pv2
        WHERE pv2.product_id = spr.product_id
          AND pv2.source_youtube_id = spr.site_data->'video'->>'embed_id'
      )
    ORDER BY spr.product_id, spr.updated_at DESC
  )
  INSERT INTO product_videos (
    product_id, cloudflare_video_id, url_stream, url_original,
    video_type, is_primary, display_order,
    source_supplier, source_youtube_id,
    title, cloudflare_status, is_active, organization_id
  )
  SELECT
    vs.product_id,
    vs.youtube_id,
    vs.embed_url,
    vs.watch_url,
    'demo', true, 0, 'xbz', vs.youtube_id,
    vs.nome_produto, 'youtube', true,
    '5db5aee1-064b-4ef4-9193-345dcd8274ea'
  FROM videos_site vs;

  GET DIAGNOSTICS v_videos_inseridos = ROW_COUNT;

  -- FIX 2026-06-07: plataforma deriva de cloudflare_status, não hardcoded 'youtube'
  -- Registros já migrados para CF Stream mantêm plataforma='cloudflare_stream'
  UPDATE products p
  SET videos = (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id',           pv2.id,
        'youtube_id',   pv2.source_youtube_id,
        'cf_uid',       CASE WHEN pv2.cloudflare_status = 'ready'
                             THEN pv2.cloudflare_video_id ELSE NULL END,
        'embed_url',    pv2.url_stream,
        'watch_url',    pv2.url_original,
        'is_primary',   pv2.is_primary,
        'title',        pv2.title,
        -- ← FIX: plataforma derivada do cloudflare_status real do registro
        'plataforma',   CASE WHEN pv2.cloudflare_status = 'ready'
                             THEN 'cloudflare_stream'
                             ELSE 'youtube' END
      ) ORDER BY pv2.display_order
    )
    FROM product_videos pv2
    WHERE pv2.product_id = p.id
      AND pv2.is_active  = true
  )
  WHERE p.supplier_id = p_supplier_id
    AND EXISTS (
      SELECT 1 FROM product_videos pv3
      WHERE pv3.product_id = p.id AND pv3.source_supplier = 'xbz'
    );

  RETURN jsonb_build_object(
    'success',           true,
    'videos_inseridos',  v_videos_inseridos,
    'segundos',          round(extract(epoch FROM clock_timestamp() - v_t0)::numeric, 2)
  );
END;
$function$
