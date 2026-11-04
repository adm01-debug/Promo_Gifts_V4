CREATE OR REPLACE FUNCTION public.fn_trigger_track_price_updated_vss()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
    IF (
        NEW.cost_price IS DISTINCT FROM OLD.cost_price OR
        NEW.list_price IS DISTINCT FROM OLD.list_price OR
        NEW.cost_price_1 IS DISTINCT FROM OLD.cost_price_1 OR
        NEW.cost_price_2 IS DISTINCT FROM OLD.cost_price_2 OR
        NEW.cost_price_3 IS DISTINCT FROM OLD.cost_price_3 OR
        NEW.cost_price_4 IS DISTINCT FROM OLD.cost_price_4 OR
        NEW.cost_price_5 IS DISTINCT FROM OLD.cost_price_5
    ) THEN
        NEW.price_updated_at := NOW();
    END IF;
    RETURN NEW;
END;
$function$
