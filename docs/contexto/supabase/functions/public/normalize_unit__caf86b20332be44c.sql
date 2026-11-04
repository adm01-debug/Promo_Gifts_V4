CREATE OR REPLACE FUNCTION public.normalize_unit(p_value numeric, p_source_unit character varying, p_target_unit character varying)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Retornar NULL se valor é NULL
    IF p_value IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Se unidades são iguais, retornar valor original
    IF LOWER(p_source_unit) = LOWER(p_target_unit) THEN
        RETURN p_value;
    END IF;
    
    -- CONVERSÕES DE PESO
    IF LOWER(p_source_unit) = 'kg' AND LOWER(p_target_unit) = 'g' THEN
        RETURN p_value * 1000;
    ELSIF LOWER(p_source_unit) = 'g' AND LOWER(p_target_unit) = 'kg' THEN
        RETURN p_value / 1000;
    ELSIF LOWER(p_source_unit) = 'kg' AND LOWER(p_target_unit) = 'mg' THEN
        RETURN p_value * 1000000;
    ELSIF LOWER(p_source_unit) = 'mg' AND LOWER(p_target_unit) = 'kg' THEN
        RETURN p_value / 1000000;
    ELSIF LOWER(p_source_unit) = 'g' AND LOWER(p_target_unit) = 'mg' THEN
        RETURN p_value * 1000;
    ELSIF LOWER(p_source_unit) = 'mg' AND LOWER(p_target_unit) = 'g' THEN
        RETURN p_value / 1000;
    
    -- CONVERSÕES DE COMPRIMENTO
    ELSIF LOWER(p_source_unit) = 'm' AND LOWER(p_target_unit) = 'cm' THEN
        RETURN p_value * 100;
    ELSIF LOWER(p_source_unit) = 'cm' AND LOWER(p_target_unit) = 'm' THEN
        RETURN p_value / 100;
    ELSIF LOWER(p_source_unit) = 'm' AND LOWER(p_target_unit) = 'mm' THEN
        RETURN p_value * 1000;
    ELSIF LOWER(p_source_unit) = 'mm' AND LOWER(p_target_unit) = 'm' THEN
        RETURN p_value / 1000;
    ELSIF LOWER(p_source_unit) = 'cm' AND LOWER(p_target_unit) = 'mm' THEN
        RETURN p_value * 10;
    ELSIF LOWER(p_source_unit) = 'mm' AND LOWER(p_target_unit) = 'cm' THEN
        RETURN p_value / 10;
    
    -- CONVERSÕES DE VOLUME
    ELSIF LOWER(p_source_unit) = 'l' AND LOWER(p_target_unit) = 'ml' THEN
        RETURN p_value * 1000;
    ELSIF LOWER(p_source_unit) = 'ml' AND LOWER(p_target_unit) = 'l' THEN
        RETURN p_value / 1000;
    
    -- Conversão não suportada
    ELSE
        RAISE WARNING 'Conversão não suportada: % → %', p_source_unit, p_target_unit;
        RETURN p_value;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro em normalize_unit: %', SQLERRM;
    RETURN p_value;
END;
$function$
