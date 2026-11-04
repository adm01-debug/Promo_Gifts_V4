CREATE OR REPLACE FUNCTION public.restore_product(p_product_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE products 
    SET is_deleted = false, deleted_at = NULL, is_active = true, updated_at = NOW()
    WHERE id = p_product_id;
    RETURN FOUND;
END;
$function$
