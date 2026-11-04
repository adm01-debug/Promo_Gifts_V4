CREATE OR REPLACE FUNCTION public.validate_product_total_percentage(p_product_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    total_pct DECIMAL;
BEGIN
    SELECT SUM(percentage) INTO total_pct
    FROM product_materials
    WHERE product_id = p_product_id
      AND is_active = true;
    
    RETURN total_pct IS NULL OR total_pct <= 100;
END;
$function$
