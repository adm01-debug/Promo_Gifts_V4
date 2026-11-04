CREATE OR REPLACE FUNCTION public.get_cloudflare_image_url(p_base_url text, p_variant character varying DEFAULT 'public'::character varying)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base TEXT;
BEGIN
    -- Se URL nula ou vazia, retorna NULL
    IF p_base_url IS NULL OR p_base_url = '' THEN
        RETURN NULL;
    END IF;
    
    -- Remove variante existente se houver (última parte após /)
    -- URL formato: https://imagedelivery.net/{hash}/{id}/{variant}
    v_base := regexp_replace(p_base_url, '/[^/]+$', '');
    
    -- Adiciona nova variante
    RETURN v_base || '/' || p_variant;
END;
$function$
