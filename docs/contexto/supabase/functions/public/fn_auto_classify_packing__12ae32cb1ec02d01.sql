CREATE OR REPLACE FUNCTION public.fn_auto_classify_packing()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_classification TEXT;
    v_packing_result JSONB;
    v_extract_result JSONB;
BEGIN
    IF NEW.packing_classification IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- PRIORIDADE 1: packing_type
    IF NEW.packing_type IS NOT NULL AND TRIM(NEW.packing_type) != '' THEN
        v_packing_result := fn_classify_packing_type(NEW.packing_type);
        v_classification := v_packing_result->>'classification';
        IF v_classification IS NOT NULL THEN
            NEW.packing_classification := v_classification;
            RETURN NEW;
        END IF;
    END IF;
    
    -- PRIORIDADE 2: descrição
    IF NEW.description IS NOT NULL AND TRIM(NEW.description) != '' THEN
        v_extract_result := fn_extract_packaging_from_description(NEW.description);
        IF (v_extract_result->>'found')::BOOLEAN = TRUE THEN
            v_packing_result := fn_classify_packing_type(v_extract_result->>'packaging_text');
            v_classification := v_packing_result->>'classification';
            IF v_classification IS NOT NULL THEN
                NEW.packing_classification := v_classification;
                RETURN NEW;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$
