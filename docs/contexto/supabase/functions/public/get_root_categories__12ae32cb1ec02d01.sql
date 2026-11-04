CREATE OR REPLACE FUNCTION public.get_root_categories()
 RETURNS TABLE(id uuid, name text, slug text, icon text, image_url text, children_count integer, products_count integer, display_order integer)
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
        c.icon,
        c.image_url,
        c.children_count, 
        c.products_count,
        c.display_order
    FROM categories c
    WHERE c.level = 1
      AND c.is_active = true
    ORDER BY c.display_order, c.name;
END;
$function$
