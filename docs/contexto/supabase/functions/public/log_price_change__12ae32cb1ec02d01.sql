CREATE OR REPLACE FUNCTION public.log_price_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.cost_1 IS DISTINCT FROM NEW.cost_1 
           OR OLD.cost_2 IS DISTINCT FROM NEW.cost_2
           OR OLD.cost_3 IS DISTINCT FROM NEW.cost_3
           OR OLD.cost_4 IS DISTINCT FROM NEW.cost_4
           OR OLD.cost_5 IS DISTINCT FROM NEW.cost_5 THEN
            
            INSERT INTO price_change_history (
                variant_id,
                change_type,
                old_values,
                new_values,
                price_variation_percent,
                source,
                changed_by
            ) VALUES (
                NEW.variant_id,
                'cost_update',
                jsonb_build_object(
                    'cost_1', OLD.cost_1, 'cost_2', OLD.cost_2, 'cost_3', OLD.cost_3,
                    'cost_4', OLD.cost_4, 'cost_5', OLD.cost_5
                ),
                jsonb_build_object(
                    'cost_1', NEW.cost_1, 'cost_2', NEW.cost_2, 'cost_3', NEW.cost_3,
                    'cost_4', NEW.cost_4, 'cost_5', NEW.cost_5
                ),
                CASE WHEN OLD.cost_1 > 0 THEN ROUND(((NEW.cost_1 - OLD.cost_1) / OLD.cost_1) * 100, 2) ELSE 0 END,
                NEW.source,
                NEW.updated_by
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$function$
