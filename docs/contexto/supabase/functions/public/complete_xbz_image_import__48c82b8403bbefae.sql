CREATE OR REPLACE FUNCTION public.complete_xbz_image_import(p_staging_id uuid, p_cloudflare_id character varying, p_product_id uuid DEFAULT NULL::uuid, p_variant_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_staging RECORD;
    v_image_id UUID;
    v_cloudflare_url TEXT;
BEGIN
    SELECT * INTO v_staging 
    FROM xbz_image_import_staging 
    WHERE id = p_staging_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Staging record not found: %', p_staging_id;
    END IF;
    
    v_cloudflare_url := format(
        'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/%s/public',
        p_cloudflare_id
    );
    
    INSERT INTO product_images (
        product_id,
        variant_id,
        cloudflare_image_id,
        url_cdn,
        url_original,
        filename,
        format,
        image_type,
        image_type_id,
        is_primary,
        is_active,
        source_supplier,
        supplier_code,
        created_at
    ) VALUES (
        COALESCE(p_product_id, v_staging.product_id),
        COALESCE(p_variant_id, v_staging.variant_id),
        p_cloudflare_id,
        v_cloudflare_url,
        v_staging.original_url,
        v_staging.filename,
        'jpg',
        v_staging.image_type,
        (SELECT id FROM image_types WHERE code = v_staging.image_type LIMIT 1),
        (v_staging.image_type = 'main'),
        true,
        'XBZ',
        'XBZ',
        NOW()
    ) RETURNING id INTO v_image_id;
    
    UPDATE xbz_image_import_staging SET
        cloudflare_id = p_cloudflare_id,
        cloudflare_url = v_cloudflare_url,
        product_id = COALESCE(p_product_id, product_id),
        variant_id = COALESCE(p_variant_id, variant_id),
        product_image_id = v_image_id,
        status = 'completed',
        processed_at = NOW()
    WHERE id = p_staging_id;
    
    RETURN v_image_id;
END;
$function$
