CREATE OR REPLACE FUNCTION public.fn_count_products_by_packing()
 RETURNS TABLE(packing_type character varying, total bigint, percentage numeric)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_total BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_total FROM products WHERE is_active = TRUE;
    
    RETURN QUERY
    SELECT 
        COALESCE(p.packing_classification, 'unknown')::VARCHAR AS packing_type,
        COUNT(*) AS total,
        ROUND(COUNT(*) * 100.0 / NULLIF(v_total, 0), 1) AS percentage
    FROM products p
    WHERE p.is_active = TRUE
    GROUP BY p.packing_classification
    ORDER BY total DESC;
END;
$function$
