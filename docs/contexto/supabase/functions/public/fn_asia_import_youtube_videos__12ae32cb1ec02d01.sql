CREATE OR REPLACE FUNCTION public.fn_asia_import_youtube_videos()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_supplier_id  uuid := 'd2734e23-d633-4819-bb15-e51aa44e2118';
  v_org_id       uuid := '5db5aee1-064b-4ef4-9193-345dcd8274ea';
  v_inserted     int  := 0;
  v_skipped      int  := 0;
  v_no_product   int  := 0;
  v_error_url    int  := 0;
  v_rec          record;
  v_yt_id        text;
  v_product_id   uuid;
  v_codigo       text;
BEGIN
  FOR v_rec IN
    SELECT DISTINCT
      -- FIX P2: usa codigo do site_data; se NULL, extrai do supplier_sku removendo sufixo de cor
      COALESCE(
        NULLIF(upper(spr.site_data->>'codigo'), ''),
        upper(regexp_replace(spr.supplier_sku, '-[^-]+$', ''))
      ) AS codigo,
      url_elem AS embed_url
    FROM supplier_products_raw spr
    CROSS JOIN LATERAL jsonb_array_elements_text(spr.site_data->'video_embed_urls') AS url_elem
    WHERE spr.supplier_id = v_supplier_id
      AND spr.site_data ? 'video_embed_urls'
      AND jsonb_array_length(spr.site_data->'video_embed_urls') > 0
      AND url_elem <> ''   -- FIX P1: ignora strings vazias cedo
  LOOP
    -- FIX P1: extrai ID de /embed/ OU de /shorts/
    v_yt_id := COALESCE(
      substring(v_rec.embed_url FROM '/embed/([a-zA-Z0-9_-]{11})'),
      substring(v_rec.embed_url FROM '/shorts/([a-zA-Z0-9_-]{11})')
    );

    IF v_yt_id IS NULL OR v_yt_id = '' THEN
      v_error_url := v_error_url + 1;
      CONTINUE;
    END IF;

    v_codigo := v_rec.codigo;

    SELECT p.id INTO v_product_id
    FROM products p
    WHERE p.supplier_id = v_supplier_id
      AND upper(p.supplier_reference) = v_codigo
    LIMIT 1;

    IF v_product_id IS NULL THEN
      v_no_product := v_no_product + 1;
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM product_videos pv
      WHERE pv.product_id       = v_product_id
        AND pv.source_youtube_id = v_yt_id
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    INSERT INTO product_videos (
      product_id, cloudflare_video_id, url_stream, url_thumbnail,
      url_original, source_youtube_id, cloudflare_status, video_type,
      is_primary, display_order, source_supplier, organization_id,
      is_active, created_at, updated_at
    ) VALUES (
      v_product_id, v_yt_id, v_rec.embed_url,
      'https://img.youtube.com/vi/' || v_yt_id || '/hqdefault.jpg',
      v_rec.embed_url, v_yt_id, 'youtube', 'promo',
      true, 1, 'ASIA', v_org_id, true, now(), now()
    );
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true, 'inserted', v_inserted, 'skipped', v_skipped,
    'no_product', v_no_product, 'error_url', v_error_url, 'ts', now()
  );
END;
$function$
