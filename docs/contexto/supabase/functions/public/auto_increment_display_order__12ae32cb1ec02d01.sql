CREATE OR REPLACE FUNCTION public.auto_increment_display_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.display_order IS NULL THEN
        SELECT COALESCE(MAX(display_order), 0) + 1
        INTO NEW.display_order
        FROM product_kit_components
        WHERE kit_product_id = NEW.kit_product_id;
    END IF;
    RETURN NEW;
END;
$function$
