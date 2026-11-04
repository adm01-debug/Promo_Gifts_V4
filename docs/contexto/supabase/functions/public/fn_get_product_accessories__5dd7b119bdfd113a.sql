CREATE OR REPLACE FUNCTION public.fn_get_product_accessories(p_product_id uuid)
 RETURNS TABLE(accessory_category_id uuid, accessory_category_name text, relationship_type character varying, display_label character varying, is_required boolean)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        c_acc.id,
        c_acc.name::TEXT,
        cac.relationship_type,
        cac.display_label,
        cac.is_required
    FROM products p
    JOIN category_accessory_categories cac ON cac.category_id = p.category_id AND cac.is_active = TRUE
    JOIN categories c_acc ON c_acc.id = cac.accessory_category_id
    WHERE p.id = p_product_id
    
    UNION
    
    -- Incluir subcategorias se include_children = TRUE
    SELECT DISTINCT
        c_child.id,
        c_child.name::TEXT,
        cac.relationship_type,
        cac.display_label,
        cac.is_required
    FROM products p
    JOIN category_accessory_categories cac ON cac.category_id = p.category_id 
        AND cac.is_active = TRUE 
        AND cac.include_children = TRUE
    JOIN categories c_child ON c_child.parent_id = cac.accessory_category_id AND c_child.is_active = TRUE
    WHERE p.id = p_product_id
    
    ORDER BY display_label, accessory_category_name;
END;
$function$
