CREATE OR REPLACE FUNCTION public.trg_fn_update_preferred_on_stock_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Só atualiza se quantidade, is_active ou removed_from_api mudaram
    IF TG_OP = 'UPDATE' AND (
        OLD.quantity IS DISTINCT FROM NEW.quantity OR
        OLD.is_active IS DISTINCT FROM NEW.is_active OR
        COALESCE(OLD.removed_from_api, FALSE) IS DISTINCT FROM COALESCE(NEW.removed_from_api, FALSE)
    ) THEN
        PERFORM update_preferred_suppliers(NEW.variant_id);
    END IF;
    
    IF TG_OP = 'INSERT' THEN
        PERFORM update_preferred_suppliers(NEW.variant_id);
    END IF;
    
    RETURN NEW;
END;
$function$
