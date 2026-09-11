
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

    -- ══════════════════════════════════════════════════════
    -- images[]: hierarquia completa de tipos
    --   0 = main+is_primary  → imagem principal definitiva
    --   1 = main             → outras variações main
    --   2 = gallery / product→ fotos de produto genéricas
    --   3 = ambient          → fotos de ambiente/uso
    --   4 = set              → foto do conjunto/combo
    --   5 = logo             → logo/gravação
    --   9 = outros incluídos
    --   ∅ = box, pouch, location, area, component → excluídos
    -- ══════════════════════════════════════════════════════
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

    -- ══════════════════════════════════════════════════════
    -- og_image_url: is_og_image > main+primary > main > gallery
    -- ══════════════════════════════════════════════════════
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

    -- ══════════════════════════════════════════════════════
    -- primary_image_url: mesma hierarquia de images[0]
    --   main+is_primary → main → gallery/product → ambient → set → logo
    --   NÃO seleciona set/logo antes de gallery quando gallery existe
    --   Proxy Worker para URLs SPOT (padrão imagedelivery/spot-)
    -- ══════════════════════════════════════════════════════
    primary_image_url = (
      SELECT
        CASE
          WHEN url_cdn LIKE '%imagedelivery.net%/spot-%'
          THEN 'https://spot-images-proxy.adm01.workers.dev/spot/' ||
               REPLACE(
                 REGEXP_REPLACE(url_cdn, '^https://imagedelivery\.net/[^/]+/spot-', ''),
                 '/public', '.jpg'
               )
          ELSE url_cdn
        END
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
    )
  WHERE id = v_product_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

COMMENT ON FUNCTION public.fn_sync_product_images_to_products() IS
'Trigger AFTER INSERT/UPDATE/DELETE em product_images.
 Reconstrói products.images, og_image_url e primary_image_url.
 Hierarquia: main+is_primary → main → gallery/product → ambient → set → logo.
 Exclui: box, pouch, location, area, component.
 XBZ product type tratado como gallery (rank 2).
 primary_image_url nunca seleciona set antes de gallery.
 PATCH 2026-06-09 v2: hierarquia completa com product type + fix set priority.';
;
