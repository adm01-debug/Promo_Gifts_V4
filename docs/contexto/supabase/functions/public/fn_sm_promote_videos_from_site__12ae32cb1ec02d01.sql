CREATE OR REPLACE FUNCTION public.fn_sm_promote_videos_from_site()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inserted int := 0;
  v_demo_type_id uuid;
BEGIN
  SELECT id INTO v_demo_type_id FROM video_types WHERE code='demo' LIMIT 1;
  
  WITH sm_videos AS (
    SELECT 
      spr.supplier_sku,
      spr.site_data->>'video_url' AS video_url,
      regexp_replace(
        spr.site_data->>'video_url',
        '^.*[?&]v=([^&]+).*$', '\1'
      ) AS youtube_id
    FROM supplier_products_raw spr
    WHERE spr.supplier_id='841cd690-210a-422a-908c-7676828db272'
      AND spr.site_data->>'video_url' IS NOT NULL
      AND spr.site_data->>'video_url' LIKE '%youtube%'
  ),
  sm_with_product AS (
    SELECT DISTINCT ON (p.id, sv.youtube_id)
      sv.youtube_id,
      sv.video_url,
      sv.supplier_sku,
      p.id AS product_id
    FROM sm_videos sv
    JOIN products p ON p.supplier_reference = sv.supplier_sku
      AND p.supplier_id = '841cd690-210a-422a-908c-7676828db272'
    WHERE NOT EXISTS (
      SELECT 1 FROM product_videos pv
      WHERE pv.product_id = p.id
        AND pv.source_youtube_id = sv.youtube_id
    )
  ),
  ins AS (
    INSERT INTO product_videos (
      product_id,
      cloudflare_video_id,
      url_stream,
      source_youtube_id,
      url_original,
      cloudflare_status,
      video_type,
      video_type_id,
      is_primary,
      display_order,
      source_supplier,
      is_active
    )
    SELECT 
      swp.product_id,
      'sm_' || swp.youtube_id,
      'https://www.youtube.com/embed/' || swp.youtube_id,
      swp.youtube_id,
      swp.video_url,
      'youtube',
      'demo',
      v_demo_type_id,
      true,
      0,
      'somarcas',
      true
    FROM sm_with_product swp
    ON CONFLICT DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO v_inserted FROM ins;
  
  RETURN jsonb_build_object(
    'ok', true,
    'inserted', v_inserted,
    'total_sm_videos_now', (SELECT COUNT(*) FROM product_videos pv 
                            JOIN products p ON p.id=pv.product_id 
                            WHERE p.supplier_id='841cd690-210a-422a-908c-7676828db272')
  );
END;
$function$
