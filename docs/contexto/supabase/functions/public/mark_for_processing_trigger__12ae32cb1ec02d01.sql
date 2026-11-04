CREATE OR REPLACE FUNCTION public.mark_for_processing_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_new_hash TEXT;
    v_old_hash TEXT;
BEGIN
    v_new_hash := MD5(NEW.raw_data::TEXT);
    
    IF TG_OP = 'INSERT' THEN
        NEW.processed := false;
        NEW.raw_hash := v_new_hash;
        NEW.imported_at := COALESCE(NEW.imported_at, NOW());
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'UPDATE' THEN
        v_old_hash := OLD.raw_hash;
        
        IF v_new_hash != v_old_hash THEN
            NEW.processed := false;
            NEW.raw_hash := v_new_hash;
            NEW.process_errors := NULL;
            NEW.processed_at := NULL;
        ELSE
            NEW.processed := OLD.processed;
            NEW.raw_hash := OLD.raw_hash;
            NEW.processed_at := OLD.processed_at;
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NEW;
END;
$function$
