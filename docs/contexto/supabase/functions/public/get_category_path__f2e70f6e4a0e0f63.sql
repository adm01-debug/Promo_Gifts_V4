CREATE OR REPLACE FUNCTION public.get_category_path(p_category_slug character varying)
 RETURNS TABLE(id uuid, name character varying, slug character varying, depth integer, is_current boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
WITH RECURSIVE category_path AS (
    -- Base: categoria solicitada
    SELECT 
        c.id,
        c.name::VARCHAR,
        c.slug::VARCHAR,
        c.parent_id,
        1 AS depth,
        TRUE AS is_current
    FROM categories c
    WHERE c.slug = p_category_slug
    
    UNION ALL
    
    -- Recursivo: ancestrais
    SELECT 
        c.id,
        c.name::VARCHAR,
        c.slug::VARCHAR,
        c.parent_id,
        cp.depth + 1,
        FALSE AS is_current
    FROM categories c
    INNER JOIN category_path cp ON c.id = cp.parent_id
)
SELECT 
    cp.id,
    cp.name,
    cp.slug,
    cp.depth,
    cp.is_current
FROM category_path cp
ORDER BY cp.depth DESC;  -- Da raiz até a categoria atual
$function$
