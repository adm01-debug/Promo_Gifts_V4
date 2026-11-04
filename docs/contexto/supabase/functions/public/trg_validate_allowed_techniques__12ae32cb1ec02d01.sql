CREATE OR REPLACE FUNCTION public.trg_validate_allowed_techniques()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_tecnica TEXT;
BEGIN
    IF NEW.allowed_technique_ids IS NOT NULL THEN
        FOR v_tecnica IN SELECT jsonb_array_elements_text(NEW.allowed_technique_ids)
        LOOP
            IF NOT EXISTS (SELECT 1 FROM tecnicas_gravacao WHERE codigo = v_tecnica AND ativo = true) THEN
                RAISE EXCEPTION 'Técnica inválida em allowed_technique_ids: %. Valores válidos: consulte tecnicas_gravacao.', v_tecnica;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$function$
