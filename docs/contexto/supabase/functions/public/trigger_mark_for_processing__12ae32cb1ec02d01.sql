CREATE OR REPLACE FUNCTION public.trigger_mark_for_processing()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Garantir que novo registro está marcado corretamente
    NEW.processed := false;
    NEW.imported_at := COALESCE(NEW.imported_at, NOW());
    
    -- Gerar batch_id se não existir
    IF NEW.import_batch_id IS NULL THEN
        NEW.import_batch_id := gen_random_uuid();
    END IF;
    
    RETURN NEW;
END;
$function$
