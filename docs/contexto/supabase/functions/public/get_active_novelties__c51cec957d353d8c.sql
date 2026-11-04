CREATE OR REPLACE FUNCTION public.get_active_novelties(p_supplier_code character varying DEFAULT NULL::character varying, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_only_highlighted boolean DEFAULT false)
 RETURNS TABLE(novelty_id uuid, product_id uuid, product_name text, product_sku text, supplier_code character varying, supplier_product_code character varying, detected_at timestamp with time zone, expires_at timestamp with time zone, days_remaining integer, is_highlighted boolean)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        n.id AS novelty_id,
        n.product_id,
        p.name AS product_name,
        p.sku AS product_sku,
        n.supplier_code,
        n.supplier_product_code,
        n.detected_at,
        n.expires_at,
        EXTRACT(DAY FROM (n.expires_at - NOW()))::INTEGER AS days_remaining,
        n.is_highlighted
    FROM public.product_novelties n
    JOIN public.products p ON n.product_id = p.id
    WHERE n.is_active = true
      AND n.expires_at > NOW()
      AND (p_supplier_code IS NULL OR n.supplier_code = p_supplier_code)
      AND (p_only_highlighted = false OR n.is_highlighted = true)
    ORDER BY n.detected_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$
