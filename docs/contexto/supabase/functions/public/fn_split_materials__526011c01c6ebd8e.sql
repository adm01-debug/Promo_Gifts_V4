CREATE OR REPLACE FUNCTION public.fn_split_materials(p_materials_string text)
 RETURNS TABLE(material_part text, sort_order integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_normalized TEXT;
    v_parts TEXT[];
    v_part TEXT;
    v_idx INTEGER := 1;
BEGIN
    IF p_materials_string IS NULL OR TRIM(p_materials_string) = '' THEN RETURN; END IF;

    v_normalized := p_materials_string;
    -- Remover gramaturas inline (ex: 180g/m², : 600g/m²) antes de splittar
    v_normalized := regexp_replace(v_normalized, ':?\s*\d+\s*g/m²', '', 'gi');
    v_normalized := TRIM(v_normalized);

    v_normalized := REPLACE(v_normalized, '. ', '|||');
    v_normalized := REPLACE(v_normalized, ' e ', '|||');
    v_normalized := REPLACE(v_normalized, '/', '|||');
    v_normalized := REPLACE(v_normalized, ', ', '|||');

    v_parts := STRING_TO_ARRAY(v_normalized, '|||');

    FOREACH v_part IN ARRAY v_parts
    LOOP
        -- Limpar espaços e dois-pontos e pontos trailing
        v_part := regexp_replace(TRIM(v_part), '[:\.]+$', '');
        v_part := TRIM(v_part);

        IF v_part != ''
           AND LENGTH(v_part) > 1
           AND v_part !~ '^[\d\s\.,]+$'
           AND v_part !~ '^(m²|kg|g|L|ml|cm|mm|%)$'
           AND v_part NOT IN ('-','–','—','n/a','N/A','NA','none','/')
        THEN
            material_part := v_part;
            sort_order := v_idx;
            v_idx := v_idx + 1;
            RETURN NEXT;
        END IF;
    END LOOP;

    RETURN;
END;
$function$
