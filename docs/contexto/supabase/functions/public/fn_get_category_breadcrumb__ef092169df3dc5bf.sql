CREATE OR REPLACE FUNCTION public.fn_get_category_breadcrumb(p_category_id uuid, p_separator text DEFAULT ' > '::text)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH RECURSIVE breadcrumb AS (
    SELECT id, name, parent_id, 1 AS depth
    FROM categories WHERE id = p_category_id
    UNION ALL
    SELECT c.id, c.name, c.parent_id, b.depth + 1
    FROM categories c
    JOIN breadcrumb b ON b.parent_id = c.id
  )
  SELECT string_agg(name, p_separator ORDER BY depth DESC)
  FROM breadcrumb;
$function$
