CREATE OR REPLACE FUNCTION public.fn_spot_detect_new_images(p_limit integer DEFAULT 200)
 RETURNS TABLE(ref text, filename text, cf_custom_id text, source_url text, product_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH bronze_imgs AS (
    SELECT DISTINCT ON (btrim(img_file))
      p.supplier_reference                                AS ref,
      btrim(img_file)                                     AS filename,
      'spot-' || LOWER(SPLIT_PART(btrim(img_file), '.', 1)) AS cf_custom_id,
      -- URL CORRETA: fotos/produtos, não cdn/media
      'https://www.spotgifts.com.br/fotos/produtos/'
        || btrim(img_file)                               AS source_url,
      p.id                                               AS product_id
    FROM supplier_products_raw spr
    JOIN products p ON spr.product_id = p.id
    CROSS JOIN LATERAL unnest(
      string_to_array(spr.raw_data->>'AllImageList', ',')
    ) AS img_file
    WHERE p.supplier_id = 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'
      AND spr.raw_data->>'AllImageList' IS NOT NULL
      AND btrim(img_file) != ''
    ORDER BY btrim(img_file)
  )
  SELECT
    bi.ref,
    bi.filename,
    bi.cf_custom_id,
    bi.source_url,
    bi.product_id
  FROM bronze_imgs bi
  WHERE NOT EXISTS (
    SELECT 1 FROM product_images pi
    WHERE pi.cloudflare_image_id = bi.cf_custom_id
  )
  LIMIT p_limit;
$function$
