CREATE OR REPLACE FUNCTION public.deactivate_products(ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  UPDATE products 
  SET is_active = false
  WHERE id = ANY(ids);
END;
$function$
