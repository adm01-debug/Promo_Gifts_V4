CREATE OR REPLACE FUNCTION public.fn_trigger_extract_materials_from_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_count INTEGER;
BEGIN
    -- Só processar se o campo materials está vazio ou null
    IF NEW.materials IS NULL OR NEW.materials = '[]'::jsonb OR jsonb_array_length(NEW.materials) = 0 THEN
        -- Extrair materiais do nome (após o INSERT, pois precisa do ID)
        PERFORM fn_extract_materials_from_name(NEW.id, FALSE);
    END IF;
    
    RETURN NEW;
END;
$function$
