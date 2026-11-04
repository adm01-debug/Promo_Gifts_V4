CREATE OR REPLACE FUNCTION public.get_category_children(p_category_id uuid)
 RETURNS TABLE(id uuid, name text, slug text, level integer, children_count integer, products_count integer, display_order integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        c.id, 
        c.name, 
        c.slug, 
        c.level,
        c.children_count,
        c.products_count,
        c.display_order
    FROM categories c
    WHERE c.parent_id = p_category_id
      AND c.is_active = true
    ORDER BY c.display_order, c.name;
END;
$function$
