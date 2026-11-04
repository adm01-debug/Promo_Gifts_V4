CREATE OR REPLACE FUNCTION public.trg_sync_ncm_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Direção 1: ncm_code → ncm_id (comportamento original)
    IF TG_OP = 'INSERT' OR (NEW.ncm_code IS DISTINCT FROM OLD.ncm_code) THEN
        NEW.ncm_id := fn_get_ncm_id(NEW.ncm_code);
    END IF;
    
    -- Direção 2: ncm_id → ncm_code (novo, evita inconsistência)
    IF NEW.ncm_code IS NULL AND NEW.ncm_id IS NOT NULL THEN
        SELECT code INTO NEW.ncm_code FROM ncm_codes WHERE id = NEW.ncm_id;
    END IF;
    
    RETURN NEW;
END;
$function$
