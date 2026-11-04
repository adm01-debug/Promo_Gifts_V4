CREATE OR REPLACE FUNCTION public.fn_sync_product_view_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE products
    SET view_count = GREATEST(0, COALESCE(view_count, 0) + 1)
    WHERE id = NEW.product_id;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE products
    SET view_count = GREATEST(0, COALESCE(view_count, 0) - 1)
    WHERE id = OLD.product_id;
  END IF;

  RETURN NULL;
END;
$function$
