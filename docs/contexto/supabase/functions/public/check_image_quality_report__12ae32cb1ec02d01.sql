CREATE OR REPLACE FUNCTION public.check_image_quality_report()
 RETURNS TABLE(check_name text, status text, details text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Check 1: Imagens sem dimensões
    RETURN QUERY
    SELECT 
        'Imagens sem dimensões registradas'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '⚠️ ATENÇÃO' END::TEXT,
        COUNT(*)::TEXT || ' imagens sem width_px/height_px'
    FROM product_images
    WHERE is_active = true 
      AND (width_px IS NULL OR height_px IS NULL);

    -- Check 2: Imagens abaixo do mínimo (800px)
    RETURN QUERY
    SELECT 
        'Imagens abaixo do mínimo (800px)'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '❌ PROBLEMA' END::TEXT,
        COUNT(*)::TEXT || ' imagens com resolução insuficiente'
    FROM product_images
    WHERE is_active = true 
      AND width_px IS NOT NULL
      AND (width_px < 800 OR height_px < 800);

    -- Check 3: Imagens abaixo do ideal (1200px)
    RETURN QUERY
    SELECT 
        'Imagens abaixo do ideal (1200px)'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '⚠️ REVISAR' END::TEXT,
        COUNT(*)::TEXT || ' imagens podem pixelar no zoom'
    FROM product_images
    WHERE is_active = true 
      AND width_px IS NOT NULL
      AND (width_px < 1200 OR height_px < 1200)
      AND width_px >= 800 AND height_px >= 800;

    -- Check 4: Imagens muito grandes (>10MB)
    RETURN QUERY
    SELECT 
        'Imagens muito grandes (>10MB)'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '⚠️ OTIMIZAR' END::TEXT,
        COUNT(*)::TEXT || ' imagens grandes demais'
    FROM product_images
    WHERE is_active = true 
      AND file_size_bytes > 10485760;  -- 10MB

    -- Check 5: Imagens de alta qualidade (>=1200px)
    RETURN QUERY
    SELECT 
        'Imagens de alta qualidade (>=1200px)'::TEXT,
        '📊 INFO'::TEXT,
        COUNT(*)::TEXT || ' imagens em qualidade ideal'
    FROM product_images
    WHERE is_active = true 
      AND width_px >= 1200 
      AND height_px >= 1200;

    RETURN;
END;
$function$
