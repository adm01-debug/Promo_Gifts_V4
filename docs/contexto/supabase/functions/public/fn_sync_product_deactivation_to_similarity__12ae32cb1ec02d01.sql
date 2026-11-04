CREATE OR REPLACE FUNCTION public.fn_sync_product_deactivation_to_similarity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF OLD.is_active = true AND NEW.is_active = false THEN
    DELETE FROM product_similarity_group_members
    WHERE product_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$
