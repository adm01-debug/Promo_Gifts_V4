CREATE OR REPLACE FUNCTION public.fn_resync_categories_products_count()
 RETURNS TABLE(categorias_corrigidas integer, total_categorias integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fixed int;
  v_total int;
BEGIN
  WITH real_counts AS (
    SELECT 
      c.id AS category_id,
      (SELECT COUNT(DISTINCT pca.product_id) 
       FROM product_category_assignments pca
       JOIN products p ON p.id = pca.product_id
       WHERE pca.category_id = c.id 
         AND p.is_active = true
         AND (p.is_deleted IS NULL OR p.is_deleted = false)
      ) AS real_count
    FROM categories c WHERE c.is_active
  ),
  upd AS (
    UPDATE categories SET products_count = rc.real_count
    FROM real_counts rc
    WHERE categories.id = rc.category_id
      AND COALESCE(categories.products_count, -1) <> rc.real_count
    RETURNING 1
  )
  SELECT COUNT(*)::int INTO v_fixed FROM upd;
  
  SELECT COUNT(*)::int INTO v_total FROM categories WHERE is_active;
  
  RETURN QUERY SELECT v_fixed, v_total;
END;
$function$
