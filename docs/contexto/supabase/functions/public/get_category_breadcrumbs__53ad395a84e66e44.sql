CREATE OR REPLACE FUNCTION public.get_category_breadcrumbs(p_category_id uuid)
 RETURNS TABLE(id uuid, name text, slug text, level integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH RECURSIVE ancestors AS (
    -- Base: categoria inicial
    SELECT c.id, c.name, c.slug, c.level, c.parent_id
    FROM categories c
    WHERE c.id = p_category_id
      AND c.deleted_at IS NULL
    
    UNION ALL
    
    -- Recursivo: parents
    SELECT c.id, c.name, c.slug, c.level, c.parent_id
    FROM categories c
    INNER JOIN ancestors a ON c.id = a.parent_id
    WHERE c.deleted_at IS NULL
  )
  SELECT a.id, a.name, a.slug, a.level
  FROM ancestors a
  ORDER BY a.level ASC;
END;
$function$
