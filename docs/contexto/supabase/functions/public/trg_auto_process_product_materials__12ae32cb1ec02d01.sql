CREATE OR REPLACE FUNCTION public.trg_auto_process_product_materials()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Só processar se materials foi alterado e não está vazio (JSONB)
    IF NEW.materials IS NOT NULL 
       AND NEW.materials != '[]'::jsonb
       AND jsonb_array_length(NEW.materials) > 0
       AND (TG_OP = 'INSERT' OR NEW.materials IS DISTINCT FROM OLD.materials) 
    THEN
        -- Processar materiais automaticamente (com replace para updates)
        PERFORM fn_process_product_materials_auto(
            NEW.id, 
            CASE WHEN TG_OP = 'UPDATE' THEN TRUE ELSE FALSE END
        );
    END IF;
    
    RETURN NEW;
END;
$function$
