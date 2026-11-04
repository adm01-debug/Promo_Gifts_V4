CREATE OR REPLACE FUNCTION public.fn_parse_composite_material(material_string text)
 RETURNS TABLE(material_part text, sort_order integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_working_string TEXT;
    v_parts TEXT[];
    v_part TEXT;
    v_counter INT := 0;
BEGIN
    IF material_string IS NULL OR trim(material_string) = '' THEN
        RETURN;
    END IF;
    
    v_working_string := trim(material_string);
    
    -- Proteger "C. sintético" (é unidade única, não separar)
    v_working_string := regexp_replace(v_working_string, 'C\.\s*sint[ée]tico', '@@COURO_SINTETICO@@', 'gi');
    v_working_string := regexp_replace(v_working_string, 'c\.\s*sint[ée]tico', '@@COURO_SINTETICO@@', 'gi');
    
    -- Proteger gramaturas (não são separadores)
    v_working_string := regexp_replace(v_working_string, '(\d+)\s*g/m²', '\1@@GRAMATURA@@', 'g');
    v_working_string := regexp_replace(v_working_string, '(\d+)\s*g/m2', '\1@@GRAMATURA@@', 'gi');
    
    -- Normalizar separadores: ". " e " e " viram @@SEP@@
    v_working_string := regexp_replace(v_working_string, '\.\s+', '@@SEP@@', 'g');
    v_working_string := regexp_replace(v_working_string, '\s+e\s+', '@@SEP@@', 'gi');
    
    -- Dividir em partes
    v_parts := string_to_array(v_working_string, '@@SEP@@');
    
    FOREACH v_part IN ARRAY v_parts
    LOOP
        v_part := trim(v_part);
        
        IF v_part = '' OR v_part IS NULL THEN
            CONTINUE;
        END IF;
        
        -- Ignorar se for só gramatura isolada
        IF v_part ~ '^[\d\s]+@@GRAMATURA@@$' THEN
            CONTINUE;
        END IF;
        
        IF length(v_part) < 2 THEN
            CONTINUE;
        END IF;
        
        -- Restaurar padrões protegidos
        v_part := regexp_replace(v_part, '@@COURO_SINTETICO@@', 'Couro Sintético', 'g');
        v_part := regexp_replace(v_part, '@@GRAMATURA@@', ' g/m²', 'g');
        
        -- Remover percentuais no início (ex: "100% algodão" → "algodão")
        v_part := regexp_replace(v_part, '^\d+%\s*', '', 'g');
        
        -- Limpar espaços extras
        v_part := trim(regexp_replace(v_part, '\s+', ' ', 'g'));
        
        IF v_part = '' OR v_part IS NULL THEN
            CONTINUE;
        END IF;
        
        v_counter := v_counter + 1;
        material_part := v_part;
        sort_order := v_counter;
        RETURN NEXT;
    END LOOP;
END;
$function$
