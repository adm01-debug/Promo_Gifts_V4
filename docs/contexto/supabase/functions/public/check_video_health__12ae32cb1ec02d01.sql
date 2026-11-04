CREATE OR REPLACE FUNCTION public.check_video_health()
 RETURNS TABLE(categoria text, metrica text, valor text, status text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Total de vídeos
    RETURN QUERY
    SELECT 'GERAL'::TEXT, 'Total de vídeos'::TEXT,
           COUNT(*)::TEXT, '📊'::TEXT
    FROM product_videos WHERE is_active = true;
    
    -- Vídeos prontos no Cloudflare
    RETURN QUERY
    SELECT 'CLOUDFLARE'::TEXT, 'Vídeos prontos (ready)'::TEXT,
           COUNT(*)::TEXT,
           CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '⚠️' END::TEXT
    FROM product_videos 
    WHERE is_active = true AND cloudflare_status = 'ready';
    
    -- Vídeos com erro
    RETURN QUERY
    SELECT 'CLOUDFLARE'::TEXT, 'Vídeos com erro'::TEXT,
           COUNT(*)::TEXT,
           CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '❌' END::TEXT
    FROM product_videos 
    WHERE is_active = true AND cloudflare_status = 'error';
    
    -- Vídeos pendentes
    RETURN QUERY
    SELECT 'CLOUDFLARE'::TEXT, 'Vídeos pendentes'::TEXT,
           COUNT(*)::TEXT,
           CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '⏳' END::TEXT
    FROM product_videos 
    WHERE is_active = true AND cloudflare_status IN ('pending', 'uploading', 'processing');
    
    -- Produtos com vídeo
    RETURN QUERY
    SELECT 'COBERTURA'::TEXT, 'Produtos com vídeo'::TEXT,
           COUNT(DISTINCT product_id)::TEXT, '📹'::TEXT
    FROM product_videos 
    WHERE is_active = true AND cloudflare_status = 'ready';
    
    -- Produtos sem vídeo
    RETURN QUERY
    SELECT 'COBERTURA'::TEXT, 'Produtos SEM vídeo'::TEXT,
           COUNT(*)::TEXT,
           CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '📋' END::TEXT
    FROM products p
    WHERE p.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM product_videos pv 
        WHERE pv.product_id = p.id AND pv.is_active = true
      );
    
    -- Vídeos sem duração
    RETURN QUERY
    SELECT 'QUALIDADE'::TEXT, 'Vídeos sem duração'::TEXT,
           COUNT(*)::TEXT,
           CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '⚠️' END::TEXT
    FROM product_videos 
    WHERE is_active = true AND duration_seconds IS NULL;
    
    -- Vídeos Full HD
    RETURN QUERY
    SELECT 'QUALIDADE'::TEXT, 'Vídeos Full HD (1080p+)'::TEXT,
           COUNT(*)::TEXT, '🎬'::TEXT
    FROM product_videos 
    WHERE is_active = true AND width_px >= 1920;
    
    -- Tipos configurados
    RETURN QUERY
    SELECT 'CONFIG'::TEXT, 'Tipos de vídeo'::TEXT,
           COUNT(*)::TEXT,
           CASE WHEN COUNT(*) >= 10 THEN '✅' ELSE '⚠️' END::TEXT
    FROM video_types WHERE is_active = true;
    
    RETURN;
END;
$function$
