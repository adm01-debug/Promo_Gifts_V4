CREATE OR REPLACE FUNCTION public.is_order_owner(p_order_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = p_order_id AND o.created_by = (SELECT auth.uid())
  );
$function$
