CREATE OR REPLACE FUNCTION public.get_category_siblings(p_category_id uuid)
 RETURNS TABLE(id uuid, name text, slug text, level integer, display_order integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_parent_id UUID;
BEGIN
    SELECT c.parent_id INTO v_parent_id
    FROM categories c
    WHERE c.id = p_category_id;
    
    RETURN QUERY
    SELECT 
        c.id, 
        c.name, 
        c.slug, 
        c.level,
        c.display_order
    FROM categories c
    WHERE (
            (c.parent_id = v_parent_id) 
            OR (c.parent_id IS NULL AND v_parent_id IS NULL)
          )
      AND c.id != p_category_id
      AND c.is_active = true
    ORDER BY c.display_order, c.name;
END;
$function$
