CREATE OR REPLACE FUNCTION public.parse_unit_from_string(p_input text, OUT valor numeric, OUT unidade text)
 RETURNS record
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_clean TEXT;
    v_number TEXT;
    v_unit TEXT;
BEGIN
    IF p_input IS NULL OR TRIM(p_input) = '' THEN
        valor := NULL;
        unidade := NULL;
        RETURN;
    END IF;
    
    -- Limpar input
    v_clean := TRIM(p_input);
    
    -- Extrair parte numérica (suporta vírgula como decimal)
    v_number := regexp_replace(v_clean, '[^0-9,.\-]', '', 'g');
    v_number := REPLACE(v_number, ',', '.');
    
    -- Extrair unidade (letras no final)
    v_unit := LOWER(regexp_replace(v_clean, '[0-9,.\s\-]', '', 'g'));
    
    -- Converter número
    BEGIN
        valor := v_number::NUMERIC;
    EXCEPTION WHEN OTHERS THEN
        valor := NULL;
    END;
    
    -- Normalizar unidade
    unidade := CASE 
        WHEN v_unit IN ('kg', 'kilo', 'kilos', 'quilos', 'quilo') THEN 'kg'
        WHEN v_unit IN ('g', 'gr', 'grama', 'gramas') THEN 'g'
        WHEN v_unit IN ('mg', 'miligrama', 'miligramas') THEN 'mg'
        WHEN v_unit IN ('l', 'lt', 'litro', 'litros') THEN 'l'
        WHEN v_unit IN ('ml', 'mililitro', 'mililitros') THEN 'ml'
        WHEN v_unit IN ('m', 'metro', 'metros') THEN 'm'
        WHEN v_unit IN ('cm', 'centimetro', 'centimetros') THEN 'cm'
        WHEN v_unit IN ('mm', 'milimetro', 'milimetros') THEN 'mm'
        WHEN v_unit IN ('in', 'inch', 'inches', 'pol', 'polegada', 'polegadas') THEN 'in'
        ELSE v_unit
    END;
END;
$function$
