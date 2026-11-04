CREATE OR REPLACE FUNCTION public.fn_get_all_leaf_categories()
 RETURNS TABLE(product_id uuid, leaf_category_id uuid, leaf_category_name text, leaf_category_level integer, leaf_category_parent_id uuid, leaf_category_slug text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'internal'
AS $function$
  SELECT
    product_id,
    leaf_category_id,
    leaf_category_name,
    leaf_category_level,
    leaf_category_parent_id,
    leaf_category_slug
  FROM internal.mv_product_leaf_category;
$function$
