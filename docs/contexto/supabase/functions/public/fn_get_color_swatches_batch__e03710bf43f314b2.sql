CREATE OR REPLACE FUNCTION public.fn_get_color_swatches_batch(p_product_ids uuid[])
 RETURNS TABLE(product_id uuid, color_swatches jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    p.id                              AS product_id,
    fn_rebuild_color_swatches(p.id)  AS color_swatches
  FROM products p
  WHERE p.id = ANY(p_product_ids)
    AND p.has_colors = true
    AND p.is_active  = true
    AND (p.is_deleted = false OR p.is_deleted IS NULL);
$function$
