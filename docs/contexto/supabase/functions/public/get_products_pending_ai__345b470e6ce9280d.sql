CREATE OR REPLACE FUNCTION public.get_products_pending_ai(p_limit integer DEFAULT 50, p_category_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(product_id uuid, sku character varying, name text, category_name text, has_raw_data boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    SELECT 
        p.id AS product_id,
        p.sku,
        p.name,
        c.name AS category_name,
        EXISTS (
            SELECT 1 FROM supplier_products_raw spr 
            WHERE spr.product_id = p.id
        ) AS has_raw_data
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.ai_generated_at IS NULL
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
    ORDER BY p.created_at DESC
    LIMIT p_limit;
$function$
