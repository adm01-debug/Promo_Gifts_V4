CREATE OR REPLACE FUNCTION public.get_category_with_children(p_parent_slug character varying DEFAULT NULL::character varying)
 RETURNS TABLE(id uuid, name character varying, slug character varying, description text, image_url text, products_count bigint, is_parent boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
SELECT 
    c.id,
    c.name::VARCHAR,
    c.slug::VARCHAR,
    c.description,
    c.image_url,
    (SELECT COUNT(DISTINCT pca.product_id) 
     FROM product_category_assignments pca
     JOIN products p ON p.id = pca.product_id
     WHERE pca.category_id = c.id
       AND p.is_active = true
       AND (p.is_deleted = false OR p.is_deleted IS NULL)
    ) AS products_count,
    EXISTS (SELECT 1 FROM categories WHERE parent_id = c.id) AS is_parent
FROM categories c
WHERE 
    CASE 
        WHEN p_parent_slug IS NULL THEN c.parent_id IS NULL
        ELSE c.parent_id = (SELECT id FROM categories WHERE slug = p_parent_slug)
    END
    AND c.is_active = true
ORDER BY c.display_order, c.name;
$function$
