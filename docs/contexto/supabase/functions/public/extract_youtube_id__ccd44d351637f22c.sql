CREATE OR REPLACE FUNCTION public.extract_youtube_id(p_url text)
 RETURNS character varying
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_id VARCHAR(20);
BEGIN
    IF p_url IS NULL OR p_url = '' THEN
        RETURN NULL;
    END IF;
    
    -- Formato: https://youtu.be/VIDEO_ID
    IF p_url LIKE '%youtu.be/%' THEN
        v_id := SUBSTRING(p_url FROM 'youtu\.be/([a-zA-Z0-9_-]+)');
    -- Formato: https://www.youtube.com/watch?v=VIDEO_ID
    ELSIF p_url LIKE '%youtube.com/watch%' THEN
        v_id := SUBSTRING(p_url FROM '[?&]v=([a-zA-Z0-9_-]+)');
    -- Formato: https://www.youtube.com/embed/VIDEO_ID
    ELSIF p_url LIKE '%youtube.com/embed/%' THEN
        v_id := SUBSTRING(p_url FROM 'youtube\.com/embed/([a-zA-Z0-9_-]+)');
    ELSE
        v_id := NULL;
    END IF;
    
    -- Validar que extraiu corretamente (11 caracteres é o padrão do YouTube)
    IF v_id IS NOT NULL AND LENGTH(v_id) != 11 THEN
        v_id := LEFT(v_id, 11);
    END IF;
    
    RETURN v_id;
END;
$function$
