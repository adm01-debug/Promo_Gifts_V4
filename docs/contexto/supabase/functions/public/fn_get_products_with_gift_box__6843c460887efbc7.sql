CREATE OR REPLACE FUNCTION public.fn_get_products_with_gift_box(p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_category_id uuid DEFAULT NULL::uuid, p_supplier_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, sku character varying, name character varying, packing_type character varying, packing_classification character varying, sale_price numeric, category_id uuid, supplier_id uuid, image_url text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.sku,
        p.name,
        p.packing_type,
        p.packing_classification,
        p.sale_price,
        p.category_id,
        p.supplier_id,
        p.image_url
    FROM products p
    WHERE p.has_gift_box = TRUE
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
    ORDER BY p.name
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$
