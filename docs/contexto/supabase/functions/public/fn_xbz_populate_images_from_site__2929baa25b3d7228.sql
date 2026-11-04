CREATE OR REPLACE FUNCTION public.fn_xbz_populate_images_from_site(p_supplier_id uuid DEFAULT 'd6718a29-e954-4c1b-bd84-03ea24884900'::uuid, p_force boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '300s'
AS $function$
DECLARE
  v_imgs_inseridas  int := 0;
  v_primary_upd     int := 0;
  v_cache_upd       int := 0;
  v_t0              timestamptz := clock_timestamp();
BEGIN

  WITH produtos AS (
    SELECT DISTINCT ON (spr.product_id)
      spr.product_id, spr.site_data->'imagens' AS imagens, p.name AS nome_produto
    FROM supplier_products_raw spr
    JOIN products p ON p.id = spr.product_id
    WHERE spr.supplier_id = p_supplier_id
      AND spr.site_status = 'processed'
      AND spr.site_data    ? 'imagens'
      AND spr.product_id  IS NOT NULL
      AND (p_force = true OR NOT EXISTS (
          SELECT 1 FROM product_images pi2
          WHERE pi2.product_id = spr.product_id
            AND UPPER(pi2.source_supplier) = 'XBZ'))
    ORDER BY spr.product_id, spr.updated_at DESC
  ),
  imgs_raw AS (
    SELECT
      p.product_id, p.nome_produto,
      img->>'url_origem'                                     AS url_original,
      (img->>'ordem')::int                                   AS ordem,
      'xbz_site_' || substr(md5(img->>'url_origem'), 1, 16) AS cf_id
    FROM produtos p, jsonb_array_elements(p.imagens) img
    WHERE (img->>'url_origem') IS NOT NULL AND length(img->>'url_origem') > 10
  ),
  imgs_classificadas AS (
    SELECT ir.*, cls.image_type_code, cls.image_type_id, cls.detected_suffix,
      CASE WHEN cls.detected_suffix = '-{COR}' THEN
        (regexp_match(
          regexp_replace(regexp_replace(regexp_replace(ir.url_original,'^.*/([^/]+)$','\1'),
            '\.[^.]+$',''), '-[0-9]{8,11}$',''),
          '-([A-Z][A-Z-]*)-[0-9]+$'))[1]
      ELSE NULL END AS cor_no_filename
    FROM imgs_raw ir, LATERAL fn_xbz_classify_image_type(ir.url_original) cls
  ),
  imgs_com_cor AS (
    SELECT ic.*, cv.id AS color_id_resolved
    FROM imgs_classificadas ic
    LEFT JOIN LATERAL (
      SELECT cv2.id FROM color_variations cv2
      WHERE ic.cor_no_filename IS NOT NULL AND (
        UPPER(REPLACE(TRIM(cv2.name),' ','-'))          = UPPER(ic.cor_no_filename)
        OR UPPER(unaccent(REPLACE(TRIM(cv2.name),' ','-'))) = UPPER(ic.cor_no_filename)
        OR UPPER(unaccent(cv2.name))                    = UPPER(REPLACE(ic.cor_no_filename,'-',' '))
      )
      LIMIT 1
    ) cv ON true
  )
  INSERT INTO product_images (
    product_id, cloudflare_image_id, url_cdn, url_original,
    image_type, image_type_id,
    is_primary, applies_to_color, color_id,
    display_order, source_supplier, supplier_code, alt_text, is_active, organization_id
  )
  SELECT
    ic.product_id, ic.cf_id, ic.url_original, ic.url_original,
    ic.image_type_code, ic.image_type_id,
    ic.image_type_code = 'main',
    ic.image_type_code = 'product',
    CASE WHEN ic.image_type_code = 'product' THEN ic.color_id_resolved ELSE NULL END,
    ic.ordem, 'XBZ', 'XBZ',
    left(ic.nome_produto ||
      CASE ic.image_type_code
        WHEN 'main'    THEN ' - imagem principal'
        WHEN 'set'     THEN ' - todas as cores'
        WHEN 'product' THEN ' - ' || COALESCE(REPLACE(ic.cor_no_filename,'-',' '),'cor')
        ELSE                ' - galeria ' || COALESCE(ic.ordem::text,'')
      END, 255),
    true, '5db5aee1-064b-4ef4-9193-345dcd8274ea'
  FROM imgs_com_cor ic
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_imgs_inseridas = ROW_COUNT;

  UPDATE products p SET primary_image_url = pi2.url_cdn, updated_at = now()
  FROM product_images pi2
  WHERE pi2.product_id = p.id AND pi2.image_type = 'main'
    AND UPPER(pi2.source_supplier) = 'XBZ' AND pi2.is_primary = true
    AND (p.primary_image_url IS NULL OR p.primary_image_url = '');
  GET DIAGNOSTICS v_primary_upd = ROW_COUNT;

  UPDATE products p
  SET images = (
    SELECT jsonb_agg(jsonb_build_object(
      'id', pi2.id, 'url', pi2.url_cdn, 'is_primary', pi2.is_primary,
      'image_type', pi2.image_type, 'color_id', pi2.color_id,
      'applies_to_color', pi2.applies_to_color,
      'display_order', pi2.display_order, 'alt_text', pi2.alt_text, 'source', pi2.source_supplier
    ) ORDER BY pi2.display_order)
    FROM product_images pi2 WHERE pi2.product_id = p.id AND pi2.is_active = true
  )
  WHERE p.supplier_id = p_supplier_id
    AND EXISTS (SELECT 1 FROM product_images pi3 WHERE pi3.product_id = p.id AND UPPER(pi3.source_supplier) = 'XBZ');
  GET DIAGNOSTICS v_cache_upd = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true, 'imgs_inseridas', v_imgs_inseridas,
    'primary_url_atualizadas', v_primary_upd, 'cache_products_atualizado', v_cache_upd,
    'segundos', round(extract(epoch FROM clock_timestamp() - v_t0)::numeric, 2)
  );
END;
$function$
