CREATE OR REPLACE FUNCTION public.insert_xbz_image_staging(p_product_code character varying, p_variant_code character varying, p_item_id integer, p_image_url text, p_color_name character varying DEFAULT NULL::character varying)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_metadata JSONB;
    v_staging_id UUID;
BEGIN
    v_metadata := extract_xbz_image_metadata(p_image_url);
    
    INSERT INTO xbz_image_import_staging (
        xbz_product_code,
        xbz_variant_code,
        xbz_item_id,
        original_url,
        filename,
        color_name,
        image_type,
        gallery_suffix,
        status
    ) VALUES (
        p_product_code,
        p_variant_code,
        p_item_id,
        p_image_url,
        v_metadata->>'filename',
        COALESCE(p_color_name, v_metadata->>'color_name'),
        v_metadata->>'image_type',
        v_metadata->>'gallery_suffix',
        'pending'
    )
    ON CONFLICT (xbz_variant_code, original_url) DO UPDATE SET
        xbz_item_id = EXCLUDED.xbz_item_id,
        color_name = COALESCE(EXCLUDED.color_name, xbz_image_import_staging.color_name),
        status = 'pending'
    RETURNING id INTO v_staging_id;
    
    RETURN v_staging_id;
END;
$function$
