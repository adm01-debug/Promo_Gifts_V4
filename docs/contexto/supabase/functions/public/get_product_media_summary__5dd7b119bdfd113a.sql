CREATE OR REPLACE FUNCTION public.get_product_media_summary(p_product_id uuid)
 RETURNS TABLE(categoria text, tipo text, quantidade bigint, tem_principal boolean)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(it.category, 'other')::TEXT AS categoria,
        COALESCE(it.code, 'unknown')::TEXT AS tipo,
        COUNT(*)::BIGINT AS quantidade,
        BOOL_OR(pi.is_primary) AS tem_principal
    FROM product_images pi
    LEFT JOIN image_types it ON pi.image_type_id = it.id
    WHERE pi.product_id = p_product_id
      AND pi.is_active = true
    GROUP BY it.category, it.code
    ORDER BY it.category, quantidade DESC;
END;
$function$
