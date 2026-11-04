CREATE OR REPLACE FUNCTION public.get_category_descendants(p_category_id uuid)
 RETURNS uuid[]
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH RECURSIVE descendants AS (
    SELECT id, parent_id
    FROM categories
    WHERE id = p_category_id
      AND is_active = true
    
    UNION ALL
    
    SELECT c.id, c.parent_id
    FROM categories c
    INNER JOIN descendants d ON c.parent_id = d.id
    WHERE c.is_active = true
  )
  SELECT COALESCE(ARRAY_AGG(id), ARRAY[]::UUID[]) 
  FROM descendants;
$function$
