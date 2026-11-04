CREATE OR REPLACE FUNCTION public.get_category_tree(p_root_slug character varying DEFAULT NULL::character varying, p_max_depth integer DEFAULT 10, p_only_active boolean DEFAULT true)
 RETURNS TABLE(id uuid, name character varying, slug character varying, parent_id uuid, depth integer, path text, path_names text, children_count bigint, products_count bigint, is_leaf boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
WITH RECURSIVE category_tree AS (
    SELECT 
        c.id,
        c.name::VARCHAR,
        c.slug::VARCHAR,
        c.parent_id,
        1 AS depth,
        c.slug::TEXT AS path,
        c.name::TEXT AS path_names
    FROM categories c
    WHERE 
        CASE 
            WHEN p_root_slug IS NOT NULL THEN c.slug = p_root_slug
            ELSE c.parent_id IS NULL
        END
        AND (NOT p_only_active OR c.is_active = true)
    
    UNION ALL
    
    SELECT 
        c.id,
        c.name::VARCHAR,
        c.slug::VARCHAR,
        c.parent_id,
        ct.depth + 1,
        (ct.path || ' > ' || c.slug)::TEXT,
        (ct.path_names || ' > ' || c.name)::TEXT
    FROM categories c
    INNER JOIN category_tree ct ON c.parent_id = ct.id
    WHERE 
        ct.depth < p_max_depth
        AND (NOT p_only_active OR c.is_active = true)
)
SELECT 
    ct.id,
    ct.name,
    ct.slug,
    ct.parent_id,
    ct.depth,
    ct.path,
    ct.path_names,
    (SELECT COUNT(*) FROM categories WHERE parent_id = ct.id) AS children_count,
    (SELECT COUNT(DISTINCT pca.product_id) 
     FROM product_category_assignments pca
     JOIN products p ON p.id = pca.product_id
     WHERE pca.category_id = ct.id
       AND p.is_active = true
       AND (p.is_deleted = false OR p.is_deleted IS NULL)
    ) AS products_count,
    NOT EXISTS (SELECT 1 FROM categories WHERE parent_id = ct.id) AS is_leaf
FROM category_tree ct
ORDER BY ct.path;
$function$
