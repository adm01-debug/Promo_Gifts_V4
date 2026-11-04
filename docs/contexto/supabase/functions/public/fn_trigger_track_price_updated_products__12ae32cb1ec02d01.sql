CREATE OR REPLACE FUNCTION public.fn_trigger_track_price_updated_products()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
    IF (
        NEW.cost_price IS DISTINCT FROM OLD.cost_price OR
        NEW.sale_price IS DISTINCT FROM OLD.sale_price OR
        NEW.suggested_price IS DISTINCT FROM OLD.suggested_price
    ) THEN
        NEW.price_updated_at := NOW();
    END IF;
    RETURN NEW;
END;
$function$
