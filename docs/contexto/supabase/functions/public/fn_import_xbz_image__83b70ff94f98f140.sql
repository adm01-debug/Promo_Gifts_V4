CREATE OR REPLACE FUNCTION public.fn_import_xbz_image(p_product_id uuid, p_cloudflare_id text, p_url_original text, p_filename text DEFAULT NULL::text, p_width integer DEFAULT NULL::integer, p_height integer DEFAULT NULL::integer, p_file_size integer DEFAULT NULL::integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_new_id UUID;
    v_cf_url TEXT;
    v_fn TEXT;
BEGIN
    v_cf_url := 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/' || p_cloudflare_id || '/public';
    v_fn := COALESCE(p_filename, REVERSE(SPLIT_PART(REVERSE(p_url_original), '/', 1)));
    
    INSERT INTO product_images (
        id, product_id,
        image_type, image_type_id,
        cloudflare_image_id, url_cdn, url_original,
        filename, format,
        width_px, height_px, file_size_bytes,
        is_primary, is_active, is_og_image,
        applies_to_color, display_order,
        source_supplier, supplier_code,
        organization_id,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), p_product_id,
        'main', '7ea182ff-edcc-4c4c-b7a1-443b07500f6c',
        p_cloudflare_id, v_cf_url, p_url_original,
        v_fn, 'jpg',
        p_width, p_height, p_file_size,
        true, true, true,
        true, 1,
        'XBZ', 'XBZ',
        '5db5aee1-064b-4ef4-9193-345dcd8274ea',
        NOW(), NOW()
    )
    ON CONFLICT (cloudflare_image_id) WHERE cloudflare_image_id IS NOT NULL
    DO NOTHING
    RETURNING id INTO v_new_id;
    
    IF v_new_id IS NULL THEN
        RAISE WARNING 'Imagem XBZ já existe (duplicata): %', v_fn;
    END IF;
    
    RETURN v_new_id;
END;
$function$
