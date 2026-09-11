
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
    -- ✅ images[]: main+primary SEMPRE primeiro, depois gallery por display_order,
    --    depois set/ambient/logo — excluindo box, pouch, location, area, component
    images = COALESCE((
      SELECT jsonb_agg(url_cdn ORDER BY
        -- Critério 1: tipo hierárquico
        CASE
          WHEN image_type = 'main'    AND is_primary = true  THEN 0  -- main principal: pos 0
          WHEN image_type = 'main'                           THEN 1  -- main secundário
          WHEN image_type = 'gallery'                        THEN 2  -- galeria
          WHEN image_type = 'ambient'                        THEN 3  -- ambiente
          WHEN image_type = 'set'                            THEN 4  -- conjunto
          WHEN image_type = 'logo'                           THEN 5  -- logo gravação
          ELSE 9
        END,
        -- Critério 2: is_primary dentro do mesmo tipo
        is_primary DESC,
        -- Critério 3: ordem explícita do fornecedor
        display_order ASC NULLS LAST
      ) FILTER (WHERE image_type NOT IN ('box','pouch','location','area','component'))
      FROM product_images
      WHERE product_id = v_product_id AND is_active = true
    ), '[]'::jsonb),

    -- og_image_url: inalterado
    og_image_url = (
      SELECT url_cdn FROM product_images
      WHERE product_id = v_product_id AND is_active = true
        AND image_type NOT IN ('box','pouch','location','area','component')
      ORDER BY
        CASE WHEN is_og_image = true THEN 0
             WHEN image_type = 'main' AND is_primary = true THEN 1
             WHEN image_type = 'main' THEN 2 ELSE 3 END,
        display_order ASC NULLS LAST
      LIMIT 1
    ),

    -- primary_image_url: inalterado (lógica de proxy SPOT preservada)
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
        CASE WHEN is_primary = true  THEN 0
             WHEN is_og_image = true THEN 1 ELSE 2 END,
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
 ORDER BY images[]: main+is_primary=0 → main=1 → gallery=2 → ambient=3 → set=4 → logo=5.
 PATCH 2026-06-09: corrigido ordering — main always pos[0].';
;
