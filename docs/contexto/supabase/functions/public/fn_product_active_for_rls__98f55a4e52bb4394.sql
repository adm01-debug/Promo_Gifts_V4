CREATE OR REPLACE FUNCTION public.fn_product_active_for_rls(p_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM products
    WHERE id = p_id AND is_active = true AND is_deleted IS NOT TRUE
  );
$function$
