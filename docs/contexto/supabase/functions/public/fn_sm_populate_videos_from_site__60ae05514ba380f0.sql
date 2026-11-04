CREATE OR REPLACE FUNCTION public.fn_sm_populate_videos_from_site(p_supplier_id uuid DEFAULT '841cd690-210a-422a-908c-7676828db272'::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '60s'
AS $function$
DECLARE
  v_inseridos int := 0;
  v_t0        timestamptz := clock_timestamp();
BEGIN
  WITH videos_site AS (
    SELECT DISTINCT ON (youtube_id)
      spr.product_id,
      (regexp_match(spr.site_data->>'video_url', E'[?&]v=([A-Za-z0-9_-]{11})'))[1] AS youtube_id,
      spr.site_data->>'video_url'                                                    AS watch_url,
      p.name                                                                         AS nome_produto
    FROM supplier_products_raw spr
    JOIN products p ON p.id = spr.product_id
    WHERE spr.supplier_id = p_supplier_id
      AND spr.source_channel = 'api_rest'
      AND spr.site_data->>'video_url' IS NOT NULL
      AND spr.product_id IS NOT NULL
      AND (regexp_match(spr.site_data->>'video_url', E'[?&]v=([A-Za-z0-9_-]{11})'))[1] IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM product_videos pv2
        WHERE pv2.product_id = spr.product_id AND pv2.source_supplier = 'somarcas'
      )
    ORDER BY youtube_id, spr.updated_at DESC
  )
  INSERT INTO product_videos (
    product_id, cloudflare_video_id, url_stream, url_original,
    video_type, is_primary, display_order,
    source_supplier, source_youtube_id,
    title, cloudflare_status, is_active, organization_id
  )
  SELECT
    vs.product_id, 'sm_' || vs.youtube_id,
    'https://www.youtube.com/embed/' || vs.youtube_id,
    vs.watch_url, 'demo', true, 0, 'somarcas', vs.youtube_id,
    vs.nome_produto, 'youtube', true,
    '5db5aee1-064b-4ef4-9193-345dcd8274ea'
  FROM videos_site vs
  ON CONFLICT (product_id, cloudflare_video_id) DO NOTHING;  -- usa constraint existente

  GET DIAGNOSTICS v_inseridos = ROW_COUNT;

  UPDATE products p
  SET videos = (
    SELECT jsonb_agg(jsonb_build_object(
      'id', pv2.id, 'youtube_id', pv2.source_youtube_id,
      'embed_url', pv2.url_stream, 'watch_url', pv2.url_original,
      'is_primary', pv2.is_primary, 'title', pv2.title, 'plataforma', 'youtube'
    ) ORDER BY pv2.display_order)
    FROM product_videos pv2 WHERE pv2.product_id = p.id AND pv2.is_active = true
  )
  WHERE p.supplier_id = p_supplier_id
    AND EXISTS (SELECT 1 FROM product_videos pv3 WHERE pv3.product_id = p.id AND pv3.source_supplier = 'somarcas');

  RETURN jsonb_build_object('success', true, 'videos_inseridos', v_inseridos,
    'supplier', 'SO_MARCAS', 'segundos', round(extract(epoch FROM clock_timestamp()-v_t0)::numeric,2));
END;
$function$
