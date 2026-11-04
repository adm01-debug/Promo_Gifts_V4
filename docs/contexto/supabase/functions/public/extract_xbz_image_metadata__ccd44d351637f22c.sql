CREATE OR REPLACE FUNCTION public.extract_xbz_image_metadata(p_url text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_filename TEXT;
    v_parts TEXT[];
    v_color_name TEXT;
    v_item_id TEXT;
    v_timestamp TEXT;
    v_gallery_suffix TEXT;
    v_image_type TEXT;
BEGIN
    -- Extrair filename da URL
    v_filename := regexp_replace(p_url, '^.*/([^/]+)$', '\1');
    
    -- Verificar se é imagem de galeria (contém d1, d2, etc.)
    IF v_filename ~ '-[0-9]+d[0-9]+-' THEN
        v_gallery_suffix := regexp_replace(v_filename, '.*-[0-9]+(d[0-9]+)-.*', '\1');
        v_item_id := regexp_replace(v_filename, '.*-([0-9]+)d[0-9]+-.*', '\1');
        v_color_name := NULL;
        
        v_image_type := CASE v_gallery_suffix
            WHEN 'd1' THEN 'ambient'
            WHEN 'd2' THEN 'set'
            WHEN 'd3' THEN 'detail'
            ELSE 'gallery'
        END;
        
    ELSIF v_filename ~ '-[A-Z][A-Z\-\s]+-[0-9]+-' THEN
        -- Com cor: Garrafa-Termica-600ml-AZUL-25722-1760987347.jpg
        v_parts := regexp_matches(v_filename, '-([A-Z][A-Z\-\s]+)-([0-9]+)-([0-9]+)\.jpg$');
        v_color_name := v_parts[1];
        v_item_id := v_parts[2];
        v_timestamp := v_parts[3];
        v_gallery_suffix := NULL;
        v_image_type := 'main';
        
    ELSE
        -- Principal sem cor
        v_parts := regexp_matches(v_filename, '-([0-9]+)-([0-9]+)\.jpg$');
        v_item_id := v_parts[1];
        v_timestamp := v_parts[2];
        v_color_name := NULL;
        v_gallery_suffix := NULL;
        v_image_type := 'main';
    END IF;
    
    RETURN jsonb_build_object(
        'filename', v_filename,
        'item_id', v_item_id::INTEGER,
        'color_name', v_color_name,
        'gallery_suffix', v_gallery_suffix,
        'image_type', v_image_type,
        'original_url', p_url
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'filename', v_filename,
        'error', SQLERRM,
        'original_url', p_url
    );
END;
$function$
