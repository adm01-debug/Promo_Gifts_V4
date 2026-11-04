CREATE OR REPLACE FUNCTION public.fn_trigger_classify_packing()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_classification JSONB;
    v_class TEXT;
BEGIN
    -- Classificar a partir do packing_type
    IF NEW.packing_type IS NOT NULL AND NEW.packing_type <> '' THEN
        v_classification := fn_classify_packing_type(NEW.packing_type);
        IF v_classification IS NOT NULL THEN
            v_class := v_classification->>'classification';
            NEW.packing_classification := v_class::VARCHAR;
        END IF;
    ELSE
        -- Tentar extrair da descrição
        IF NEW.description IS NOT NULL AND NEW.description <> '' THEN
            DECLARE v_extracted JSONB;
            BEGIN
                v_extracted := fn_extract_packaging_from_description(NEW.description);
                IF v_extracted IS NOT NULL AND (v_extracted->>'found')::boolean = true THEN
                    NEW.packing_type := v_extracted->>'packaging_text';
                    v_classification := fn_classify_packing_type(NEW.packing_type);
                    IF v_classification IS NOT NULL THEN
                        v_class := v_classification->>'classification';
                        NEW.packing_classification := v_class::VARCHAR;
                    END IF;
                END IF;
            END;
        END IF;
    END IF;

    -- Setar flags derivados de forma atômica (mesmo passo)
    -- Assim, UPDATE de packing_type propaga corretamente para todas as flags
    IF NEW.packing_classification = 'commercial' THEN
        NEW.has_gift_box := TRUE;
        NEW.has_commercial_packaging := TRUE;
        NEW.has_optional_packaging := FALSE;
    ELSIF NEW.packing_classification = 'protective' THEN
        NEW.has_gift_box := FALSE;
        NEW.has_commercial_packaging := FALSE;
        NEW.has_optional_packaging := TRUE;
    ELSIF NEW.packing_classification IN ('none','unknown') OR NEW.packing_classification IS NULL THEN
        NEW.has_gift_box := FALSE;
        NEW.has_commercial_packaging := FALSE;
        NEW.has_optional_packaging := FALSE;
    END IF;

    RETURN NEW;
END;
$function$
