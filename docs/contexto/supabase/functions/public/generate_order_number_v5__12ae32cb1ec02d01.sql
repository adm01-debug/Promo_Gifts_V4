CREATE OR REPLACE FUNCTION public.generate_order_number_v5()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE year_suffix TEXT := to_char(now(), 'YY'); next_val INTEGER;
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        SELECT count(*) + 1 INTO next_val FROM public.orders 
        WHERE order_number LIKE 'PED-' || year_suffix || '-%';
        NEW.order_number := 'PED-' || year_suffix || '-' || lpad(next_val::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$function$
