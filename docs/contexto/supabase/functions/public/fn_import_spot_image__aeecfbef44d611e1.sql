CREATE OR REPLACE FUNCTION public.fn_import_spot_image(p_filename text, p_cloudflare_id text, p_url_original text, p_width integer DEFAULT NULL::integer, p_height integer DEFAULT NULL::integer, p_file_size integer DEFAULT NULL::integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_class RECORD;
    v_product_id UUID;
    v_new_id UUID;
    v_cf_url TEXT;
BEGIN
    SELECT * INTO v_class FROM fn_classify_spot_image(p_filename) LIMIT 1;
    
    IF v_class.prod_reference IS NULL THEN
        RAISE EXCEPTION 'Filename não reconhecido: %', p_filename;
    END IF;
    
    SELECT p.id INTO v_product_id
    FROM products p
    WHERE p.supplier_reference = v_class.prod_reference
      AND p.supplier_id = 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'::uuid
    LIMIT 1;
    
    IF v_product_id IS NULL THEN
        RAISE WARNING 'Produto não encontrado para ref: %', v_class.prod_reference;
        RETURN NULL;
    END IF;
    
    v_cf_url := 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/' || p_cloudflare_id || '/public';
    
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
        alt_text, title_text,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_product_id,
        v_class.image_type, v_class.image_type_id,
        p_cloudflare_id, v_cf_url, p_url_original,
        p_filename, LOWER(SPLIT_PART(p_filename, '.', 2)),
        p_width, p_height, p_file_size,
        v_class.is_primary_image, true, v_class.is_primary_image,
        v_class.is_color_specific, v_class.display_order_hint,
        'SPOT', 'SPOT',
        '5db5aee1-064b-4ef4-9193-345dcd8274ea',
        NULL, NULL,
        NOW(), NOW()
    )
    ON CONFLICT (cloudflare_image_id) WHERE cloudflare_image_id IS NOT NULL
    DO NOTHING
    RETURNING id INTO v_new_id;
    
    IF v_new_id IS NULL THEN
        RAISE WARNING 'Imagem já existe (duplicata): %', p_filename;
    END IF;
    
    RETURN v_new_id;
END;
$function$
