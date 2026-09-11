-- M3: Atualizar fn_sync_product_images_to_products para popular primary_image_fallback_url
CREATE OR REPLACE FUNCTION public.fn_sync_product_images_to_products()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_product_id UUID;
BEGIN
  v_product_id := COALESCE(NEW.product_id, OLD.product_id);

  UPDATE products SET
    images = COALESCE((
      SELECT jsonb_agg(url_cdn ORDER BY
        CASE
          WHEN image_type = 'main'    AND is_primary = true  THEN 0
          WHEN image_type = 'main'                           THEN 1
          WHEN image_type IN ('gallery','product')           THEN 2
          WHEN image_type = 'ambient'                        THEN 3
          WHEN image_type = 'set'                            THEN 4
          WHEN image_type = 'logo'                           THEN 5
          ELSE 9
        END,
        is_primary DESC,
        display_order ASC NULLS LAST
      ) FILTER (WHERE image_type NOT IN ('box','pouch','location','area','component'))
      FROM product_images
      WHERE product_id = v_product_id AND is_active = true
    ), '[]'::jsonb),

    og_image_url = (
      SELECT url_cdn FROM product_images
      WHERE product_id = v_product_id AND is_active = true
        AND image_type NOT IN ('box','pouch','location','area','component')
      ORDER BY
        CASE WHEN is_og_image = true                          THEN 0
             WHEN image_type = 'main' AND is_primary = true  THEN 1
             WHEN image_type = 'main'                         THEN 2
             WHEN image_type IN ('gallery','product')         THEN 3
             WHEN image_type = 'ambient'                      THEN 4
             WHEN image_type = 'set'                          THEN 5
             ELSE 9 END,
        is_primary DESC,
        display_order ASC NULLS LAST
      LIMIT 1
    ),

    -- CF CDN URL (primary display image)
    primary_image_url = (
      SELECT url_cdn
      FROM product_images
      WHERE product_id = v_product_id AND is_active = true
        AND image_type NOT IN ('box','pouch','location','area','component')
      ORDER BY
        CASE
          WHEN image_type = 'main'    AND is_primary = true  THEN 0
          WHEN image_type = 'main'                           THEN 1
          WHEN image_type IN ('gallery','product') AND is_primary = true THEN 2
          WHEN image_type IN ('gallery','product')           THEN 3
          WHEN image_type = 'ambient'                        THEN 4
          WHEN image_type = 'set'    AND is_primary = true  THEN 5
          WHEN image_type = 'set'                            THEN 6
          WHEN image_type = 'logo'                           THEN 7
          ELSE 9
        END,
        is_primary DESC,
        display_order ASC NULLS LAST
      LIMIT 1
    ),

    -- ─── NOVO: url_original do fornecedor como fallback quando CF falha ──────────
    -- Mesma ordem de prioridade que primary_image_url mas retorna url_original
    -- Usado pelo OptimizedImage para fallback: CF Images → supplier CDN → <ImageOff/>
    primary_image_fallback_url = (
      SELECT url_original
      FROM product_images
      WHERE product_id = v_product_id AND is_active = true
        AND url_original IS NOT NULL AND url_original != ''
      ORDER BY
        CASE
          WHEN image_type = 'main'    AND is_primary = true  THEN 0
          WHEN image_type = 'main'                           THEN 1
          WHEN image_type IN ('gallery','product') AND is_primary = true THEN 2
          WHEN image_type IN ('gallery','product')           THEN 3
          WHEN image_type = 'ambient'                        THEN 4
          WHEN image_type = 'set'    AND is_primary = true  THEN 5
          WHEN image_type = 'set'                            THEN 6
          WHEN image_type = 'logo'                           THEN 7
          ELSE 9
        END,
        is_primary DESC,
        display_order ASC NULLS LAST
      LIMIT 1
    )
    -- ────────────────────────────────────────────────────────────────────────────

  WHERE id = v_product_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;;
