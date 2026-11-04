-- =================================================================
-- FIX: 3 functions que contam pca SEM filtrar is_active/is_deleted
-- Corrigido em: 2026-03-22
-- =================================================================

-- 1. get_category_tree
CREATE OR REPLACE FUNCTION public.get_category_tree(
  p_root_slug character varying DEFAULT NULL::character varying, 
  p_max_depth integer DEFAULT 10, 
  p_only_active boolean DEFAULT true
)
RETURNS TABLE(id uuid, name character varying, slug character varying, parent_id uuid, depth integer, path text, path_names text, children_count bigint, products_count bigint, is_leaf boolean)
LANGUAGE sql
STABLE
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
$function$;

-- 2. get_category_with_children
CREATE OR REPLACE FUNCTION public.get_category_with_children(
  p_parent_slug character varying DEFAULT NULL::character varying
)
RETURNS TABLE(id uuid, name character varying, slug character varying, description text, image_url text, products_count bigint, is_parent boolean)
LANGUAGE sql
STABLE
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
$function$;

-- 3. search_suggestions (assinatura EXATA: character varying, integer)
CREATE OR REPLACE FUNCTION public.search_suggestions(
  p_partial_term character varying, 
  p_limit integer DEFAULT 10
)
RETURNS TABLE(suggestion character varying, suggestion_type character varying, count bigint)
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
    v_term_normalized TEXT;
BEGIN
    v_term_normalized := unaccent(lower(trim(p_partial_term)));
    
    IF length(v_term_normalized) < 2 THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    (
        SELECT DISTINCT
            p.name::VARCHAR AS suggestion,
            'produto'::VARCHAR AS suggestion_type,
            COUNT(*)::BIGINT AS count
        FROM products p
        WHERE 
            p.is_active = true
            AND (p.is_deleted = false OR p.is_deleted IS NULL)
            AND unaccent(lower(p.name)) LIKE v_term_normalized || '%'
        GROUP BY p.name
        ORDER BY count DESC
        LIMIT p_limit / 2
    )
    UNION ALL
    (
        SELECT DISTINCT
            c.name::VARCHAR AS suggestion,
            'categoria'::VARCHAR AS suggestion_type,
            (SELECT COUNT(DISTINCT pca.product_id) 
             FROM product_category_assignments pca
             JOIN products p2 ON p2.id = pca.product_id
             WHERE pca.category_id = c.id
               AND p2.is_active = true
               AND (p2.is_deleted = false OR p2.is_deleted IS NULL)
            )::BIGINT AS count
        FROM categories c
        WHERE 
            c.is_active = true
            AND unaccent(lower(c.name)) LIKE v_term_normalized || '%'
        ORDER BY count DESC
        LIMIT p_limit / 2
    )
    ORDER BY count DESC
    LIMIT p_limit;
END;
$function$;
