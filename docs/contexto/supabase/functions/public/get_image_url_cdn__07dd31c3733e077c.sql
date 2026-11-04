CREATE OR REPLACE FUNCTION public.get_image_url_cdn(p_image_id uuid, p_width integer DEFAULT NULL::integer, p_height integer DEFAULT NULL::integer, p_format character varying DEFAULT NULL::character varying)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_url TEXT;
    v_params TEXT := '';
BEGIN
    SELECT url_cdn INTO v_url FROM public.product_images WHERE id = p_image_id;
    
    IF v_url IS NULL THEN RETURN NULL; END IF;
    
    IF p_width IS NOT NULL THEN
        v_params := '/width=' || p_width;
    END IF;
    
    IF p_height IS NOT NULL THEN
        v_params := v_params || CASE WHEN v_params != '' THEN ',' ELSE '/' END || 'height=' || p_height;
    END IF;
    
    IF p_format IS NOT NULL THEN
        v_params := v_params || CASE WHEN v_params != '' THEN ',' ELSE '/' END || 'format=' || p_format;
    END IF;
    
    RETURN v_url || v_params;
END;
$function$
