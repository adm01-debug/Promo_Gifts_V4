CREATE OR REPLACE FUNCTION public.fn_trigger_propagate_category_min()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Se min_order_quantity mudou, propagar para produtos
    IF OLD.min_order_quantity IS DISTINCT FROM NEW.min_order_quantity THEN
        UPDATE products
        SET min_quantity = NEW.min_order_quantity
        WHERE category_id = NEW.id
          AND min_order_quantity IS NULL;
    END IF;
    
    RETURN NEW;
END;
$function$
