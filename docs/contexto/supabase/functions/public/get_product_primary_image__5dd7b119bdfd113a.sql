CREATE OR REPLACE FUNCTION public.get_product_primary_image(p_product_id uuid)
 RETURNS TABLE(image_id uuid, cloudflare_id character varying, url_cdn text, url_thumbnail text, url_medium text, url_large text, image_type character varying, image_type_name character varying)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
    -- 1. Primeiro tenta buscar onde is_primary = true
    RETURN QUERY
    SELECT 
        pi.id,
        pi.cloudflare_image_id,
        pi.url_cdn,
        pi.url_cdn || '/thumbnail',
        pi.url_cdn || '/medium',
        pi.url_cdn || '/large',
        it.code,
        it.name
    FROM product_images pi
    LEFT JOIN image_types it ON pi.image_type_id = it.id
    WHERE pi.product_id = p_product_id
      AND pi.is_primary = true
      AND pi.is_active = true
    LIMIT 1;
    
    -- 2. Se não encontrou, busca tipo 'main' ou 'product'
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            pi.id,
            pi.cloudflare_image_id,
            pi.url_cdn,
            pi.url_cdn || '/thumbnail',
            pi.url_cdn || '/medium',
            pi.url_cdn || '/large',
            it.code,
            it.name
        FROM product_images pi
        LEFT JOIN image_types it ON pi.image_type_id = it.id
        WHERE pi.product_id = p_product_id
          AND it.code IN ('main', 'product')
          AND pi.is_active = true
        ORDER BY pi.display_order
        LIMIT 1;
    END IF;
    
    -- 3. Se ainda não encontrou, pega a primeira disponível
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            pi.id,
            pi.cloudflare_image_id,
            pi.url_cdn,
            pi.url_cdn || '/thumbnail',
            pi.url_cdn || '/medium',
            pi.url_cdn || '/large',
            it.code,
            it.name
        FROM product_images pi
        LEFT JOIN image_types it ON pi.image_type_id = it.id
        WHERE pi.product_id = p_product_id
          AND pi.is_active = true
        ORDER BY it.display_priority, pi.display_order
        LIMIT 1;
    END IF;
END;
$function$
